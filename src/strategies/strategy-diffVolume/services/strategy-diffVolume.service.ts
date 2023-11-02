import {inject, injectable} from "inversify";
import 'reflect-metadata';

import {OrderTakeStopInterface} from "../../../shared/types/position.interface";
import {InstanceStrategyEnum} from "../../../shared/types/instance-strategy.enum";
import {ApiModuleEnum} from "../../../api/api-module.enum";
import {BinanceMarginClientService} from "../../../api/binance/binance-margin-client.service";
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {LoggerService} from "../../../shared/logger/logger.service";
import {ConfigService} from "../../../shared/config/config.service";
import {OrderTakeStopRepositoryService} from "../../../shared/services/OrderTakeStop.repository.service";
import {ParserService} from "../../../shared/services/parser.service";
import {TelegramBotService} from "../../../shared/telegram-bot/telegram-bot.service";
import {StrategyDiffVolumeModuleEnum} from "../strategy-diffVolume.module.enum";
import {IndicatorsService} from "./indicators.service";
import {SignalService} from "./signal.service";
import {TelegramCommandsEnum} from "../../../shared/types/telegram-commands.enum";
import {StrategyEnum} from "../../../shared/types/strategy.enum";
import {TestSymbolWalletInterface} from "../../../shared/types/testSymbolWallet.interface";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {SideOrderEnum} from "../../../shared/types/side-order.enum";
import {StatusPositionsEnum} from "../../../shared/types/status-positions.enum";
import {v4 as uuidv4} from "uuid";

@injectable()
export class StrategyDiffVolumeService {
    positions: OrderTakeStopInterface[] = [];
    instance: InstanceStrategyEnum = InstanceStrategyEnum.TEST;
    idInterval: NodeJS.Timer;
    percentDeal = 0.2;
    symbolWallet = {
        symbol: "",
        baseAsset: "",
        quoteAsset: "",
        valueBaseAsset: 0,
        valueQuoteAsset: 0
    }

    private lastTimeCheckStrategy = '';

    constructor(
        @inject(StrategyDiffVolumeModuleEnum.DiffVolumeIndicator) private _indicators: IndicatorsService,
        @inject(StrategyDiffVolumeModuleEnum.DiffVolumeSignal) private _signals: SignalService,
        @inject(ApiModuleEnum.binanceMarginClient) private _binanceMarginClient: BinanceMarginClientService,
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
        @inject(SharedModuleEnum.config) private _config: ConfigService,
        @inject(SharedModuleEnum.orderTakeStopRepository) private _orderRepository: OrderTakeStopRepositoryService,
        @inject(SharedModuleEnum.parser) private _parser: ParserService,
        @inject(SharedModuleEnum.telegramBot) private _telegramBot: TelegramBotService,
    ) {
    }


    async init() {
        this._telegramBot.bot.on('message', (msg: any) => {
            if (msg.text === TelegramCommandsEnum.check_last_time) {
                this._telegramBot.sendMessage("[diff volume] Last check: " + this.lastTimeCheckStrategy)
            }
            if (msg.text === TelegramCommandsEnum.open_positions) {
                this._orderRepository.getAllOpenPositions().then(value => {
                    this._telegramBot.sendMessage('[diff volume] Open positions: ' + JSON.stringify(value))
                });
            }
            if (msg.text === TelegramCommandsEnum.summ_result) {
                (async () => {
                    const res = await this.calcResult();
                    this._telegramBot.sendMessage('[diff volume] result: ' + res)
                })()
            }
            if (msg.text === TelegramCommandsEnum.clear_data) {
                this._orderRepository.clearData(StrategyEnum.DiffVolume)
                this._telegramBot.sendMessage('[diff volume] Data cleaned')
            }
            if (msg.text === TelegramCommandsEnum.close_position) {
                this.checkSignal(true);
                this._telegramBot.sendMessage('[diff volume] Handle close position')
            }
        })
    }

    async start() {
        if (this._config.config.env === InstanceStrategyEnum.PROD) {
            await this.startStrategy()
        } else {
            await this.startTestStrategy()
        }
    }


    async startStrategy() {
        clearInterval(this.idInterval);
        const time = new Date().toString();
        this.lastTimeCheckStrategy = time.slice(0, time.indexOf('G'));
        console.log(this.lastTimeCheckStrategy)
        this.instance = this._config.config.env;
        const symbolData = this._config.config.Symbols;
        await this.checkBySymbols(symbolData, 0);
        this.startNextCheckStrategy()
    }

    private startNextCheckStrategy() {
        const timeNow = Date.now();
        const millisecondsInPeriod = this._parser.parseIntervalToMilliseconds(this._config.config.DiffVolume.interval);
        const delayCloseBar = 1000 * 10;
        const nextCheck = Math.ceil(timeNow / millisecondsInPeriod) * millisecondsInPeriod - timeNow + delayCloseBar
        this.idInterval = setTimeout(async () => {
            await this.startStrategy();
        }, nextCheck)
    }

    async startTestStrategy() {
        this.instance = InstanceStrategyEnum.TEST;
        const data = this._config.config.Symbols;
        await this.checkBySymbols(data, 0)
    }

    private async checkBySymbols(data: TestSymbolWalletInterface[], indexSymbol: number) {
        const symbolData = data[indexSymbol]
        if (!symbolData) return
        await this._indicators.init(symbolData.symbol, this.instance);
        this.symbolWallet = {...symbolData};
        this.positions = [];

        if (this.instance === InstanceStrategyEnum.PROD) {
            // console.log(`TREND: ${this._signals.trend()}`)
            await this.checkSignal();
        }

        if (this.instance === InstanceStrategyEnum.TEST) {
            console.log(new Date(this._indicators.currentBar[BarRespEnum.openTime]))
            while (this._indicators.index < this._indicators.historyData.length) {
                await this.checkSignal();
                this._indicators.increaseCounter();
            }

            await this.testResult(data[indexSymbol])
        }
        await this.checkBySymbols(data, indexSymbol + 1)
    }

    private async checkSignal(handleClosePosition?: boolean) {

        const openPosition = await this.getOpenPosition();
        const signalOpenLongPosition = this._signals.signalOpenLongPosition();
        const signalOpenShortPosition = this._signals.signalOpenShortPosition();

        if (openPosition.length) {
            openPosition.forEach(position => {
                position.side === SideOrderEnum.BUY ?  this.closeLongPosition(position) : this.closeShortPosition(position);
            })
        }
        if (signalOpenLongPosition) await this.openLongPosition(this.symbolWallet.symbol, signalOpenLongPosition.stopPrice, signalOpenLongPosition.takePrice);
        if (signalOpenShortPosition) await this.openShortPosition(this.symbolWallet.symbol, signalOpenShortPosition.stopPrice, signalOpenShortPosition.takePrice);

    }

    private async openLongPosition(symbol: string, stopPrice: number, takePrice: number) {
        if (this.instance === InstanceStrategyEnum.PROD) {
            const quantity = await this.getQuoteOrderQty(symbol);
            const result = await this._binanceMarginClient.newOrderIsolate({
                symbol, quantity,
                side: SideOrderEnum.BUY,
                isOpenPosition: false
            });
            if (!result) {
                return
            }

            const position: OrderTakeStopInterface = {
                symbol,
                side: SideOrderEnum.BUY,
                priceOpen: result.price,
                timeOpen: result.time,
                status: StatusPositionsEnum.OPEN,
                fee: result.fee,
                feeAsset: result.feeAsset,
                id: result.orderId,
                sizeBase: result.sizeBase,
                sizeQuote: result.sizeQuote,
                profit: null,
                feeClose: null,
                priceClose: null,
                profitPercent: null,
                timeClose: null,
                account: this._config.config.DiffVolume.account,
                strategy: StrategyEnum.DiffVolume,
                stopPrice, takePrice
            }
            await this._orderRepository.openOrder(position)
            this._logger.result('[diff volume] Open Long Position: ', position);
        } else {
            const currentBar = this._indicators.currentBar;
            const position: OrderTakeStopInterface = {
                id: uuidv4(),
                side: SideOrderEnum.BUY,
                status: StatusPositionsEnum.OPEN,
                feeAsset: this.symbolWallet.quoteAsset,
                symbol: this.symbolWallet.symbol,
                priceOpen: +currentBar[BarRespEnum.closePrice],
                sizeQuote: this.symbolWallet.valueQuoteAsset * this.percentDeal,
                timeOpen: new Date(currentBar[BarRespEnum.openTime]),
                feeClose: null,
                priceClose: null,
                profit: null,
                profitPercent: null,
                timeClose: null,
                sizeBase: 0,
                fee: 0,
                account: this._config.config.DiffVolume.account,
                strategy: StrategyEnum.DiffVolume,
                takePrice, stopPrice
            }
            position.sizeBase = position.sizeQuote / position.priceOpen;
            position.fee = position.sizeQuote * (0.1 / 100)

            this.symbolWallet.valueBaseAsset += position.sizeBase;
            this.symbolWallet.valueQuoteAsset -= position.sizeQuote;
            this.positions.push(position);
        }

    }

    private async closeLongPosition(openPosition: OrderTakeStopInterface, handleClose?:boolean) {
        const currentBar = this._indicators.currentBar;

        if (!(this._signals.signalCloseLongPosition(openPosition) || this._signals.stopLimitLongPosition(openPosition))) return;
        if (this._signals.stopLimitLongPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT;
        if (this._signals.signalCloseLongPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_TAKE;
        if (handleClose) openPosition.status = StatusPositionsEnum.CLOSED_BY_USER;
        if (this.instance === InstanceStrategyEnum.PROD) {
            this._telegramBot.sendMessage(`Position has not been closed yet. ${openPosition} `)
            // const result = await this._binanceMarginClient.newOrderIsolate({
            //     symbol: openPosition.symbol,
            //     side: SideOrderEnum.SELL,
            //     isOpenPosition: true,
            //     quantity: openPosition.sizeBase
            // });
            // if (!result) return;
            // const {feeAsset, fee, sizeQuote, price, time} = result
            // openPosition.timeClose = time;
            // openPosition.priceClose = price;
            // openPosition.feeClose = fee;
            // openPosition.feeAsset = feeAsset;
            // openPosition.profit = openPosition.sizeQuote - sizeQuote;
            // openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            // await this._orderRepository.closePosition(openPosition)
            // this._logger.result('[diff volume] CLose Long position: ', openPosition)
        } else {
            openPosition.timeClose = new Date(currentBar[BarRespEnum.openTime]);
            openPosition.priceClose = this._signals.signalCloseLongPosition(openPosition) ?
                openPosition.takePrice : openPosition.stopPrice

            const deal = openPosition.sizeQuote / openPosition.priceClose;

            openPosition.profit = openPosition.sizeBase - deal;
            openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            openPosition.feeClose = deal * (0.1 / 100)

            this.symbolWallet.valueBaseAsset -= deal;
            this.symbolWallet.valueQuoteAsset += openPosition.sizeQuote;
        }


    }

    private async openShortPosition(symbol: string, stopPrice: number, takePrice: number) {
        if (this.instance === InstanceStrategyEnum.PROD) {
            const quantity = await this.getQuoteOrderQty(symbol);
            const result = await this._binanceMarginClient.newOrderIsolate({
                symbol, quantity,
                side: SideOrderEnum.SELL,
                isOpenPosition: false
            });

            if (!result) {
                this._logger.error('Error open short position');
                return
            }

            const position: OrderTakeStopInterface = {
                symbol, takePrice, stopPrice,
                side: SideOrderEnum.SELL,
                priceOpen: result.price,
                timeOpen: result.time,
                status: StatusPositionsEnum.OPEN,
                fee: result.fee,
                feeAsset: result.feeAsset,
                id: result.orderId,
                sizeBase: result.sizeBase,
                sizeQuote: result.sizeQuote,
                profit: null,
                feeClose: null,
                priceClose: null,
                profitPercent: null,
                timeClose: null,
                account: this._config.config.DiffVolume.account,
                strategy: StrategyEnum.DiffVolume
            }
            await this._orderRepository.openOrder(position);
            this._logger.result('[diff volume] Open Short Position: ', position);

        } else {
            const currentBar = this._indicators.currentBar;

            const position: OrderTakeStopInterface = {
                id: uuidv4(),
                side: SideOrderEnum.SELL,
                status: StatusPositionsEnum.OPEN,
                feeAsset: this.symbolWallet.baseAsset,
                symbol: this.symbolWallet.symbol,
                priceOpen: +currentBar[BarRespEnum.closePrice],
                sizeBase: this.symbolWallet.valueBaseAsset * this.percentDeal,
                timeOpen: new Date(currentBar[BarRespEnum.openTime]),
                feeClose: null,
                priceClose: null,
                profit: null,
                profitPercent: null,
                timeClose: null,
                sizeQuote: 0,
                fee: 0,
                account: this._config.config.DiffVolume.account,
                strategy: StrategyEnum.DiffVolume,
                stopPrice, takePrice
            }
            position.sizeQuote = position.priceOpen * position.sizeBase;
            position.fee = position.sizeQuote * (0.1 / 100)

            this.symbolWallet.valueBaseAsset -= position.sizeBase;
            this.symbolWallet.valueQuoteAsset += position.sizeQuote;
            this.positions.push(position)
        }
    }

    private async closeShortPosition(openPosition: OrderTakeStopInterface, handleClose?: boolean) {

        if (!(this._signals.signalCloseShortPosition(openPosition) || this._signals.stopLimitShortPosition(openPosition))) return;
        if (this._signals.stopLimitShortPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT;
        if (this._signals.signalCloseShortPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_TAKE;
        if (handleClose) openPosition.status = StatusPositionsEnum.CLOSED_BY_USER;
        if (this.instance === InstanceStrategyEnum.PROD) {
            this._telegramBot.sendMessage(`Position has not been closed yet. ${openPosition} `)

            // const result = await this._binanceMarginClient.newOrderIsolate(
            //     {
            //         symbol: openPosition.symbol,
            //         isOpenPosition: true,
            //         side: SideOrderEnum.BUY,
            //         quantity: openPosition.sizeBase
            //     }
            // );
            // if (!result) {
            //     return
            // }
            // openPosition.timeClose = result.time;
            // openPosition.priceClose = result.price;
            // openPosition.feeClose = result.fee;
            // openPosition.feeAsset = result.feeAsset;
            // openPosition.profit = result.sizeQuote - openPosition.sizeQuote;
            // openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            //
            // await this._orderRepository.closePosition(openPosition);
            // this._logger.result('[diff volume] Close Short Position: ', openPosition)
        } else {
            const currentBar = this._indicators.currentBar;
            openPosition.timeClose = new Date(currentBar[BarRespEnum.openTime]);
            openPosition.priceClose = this._signals.signalCloseShortPosition(openPosition) ?
                openPosition.takePrice : openPosition.stopPrice

            const deal = openPosition.sizeQuote / openPosition.priceClose;

            openPosition.profit = deal - openPosition.sizeBase;
            openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            openPosition.feeClose = deal * (0.1 / 100)

            this.symbolWallet.valueBaseAsset += deal;
            this.symbolWallet.valueQuoteAsset -= openPosition.sizeQuote;
            // this._logger.result(openPosition, this.symbolWallet)
        }
    }

    private async getOpenPosition(): Promise<OrderTakeStopInterface[]> {
        if (this.instance === InstanceStrategyEnum.TEST) {
            return this.positions.filter(value => value.status === StatusPositionsEnum.OPEN);
        } else {
            return this._orderRepository.getAllOpenPositions().then(res => res.filter(el => el.strategy === StrategyEnum.DiffVolume))
        }

    }

    private async getQuoteOrderQty(symbol: string): Promise<number> {
        const quantity = await this._binanceMarginClient.getFreeQuoteAsset(symbol);
        const currentPrice = this._indicators.historyData[this._indicators.index][BarRespEnum.closePrice];
        const QuoteOrderQty: number = quantity * +currentPrice;
        return +Math.round(QuoteOrderQty / 10) * 10;
    }

    private _calcPercent(firstValue: number, secondValue: number): number {
        return +((firstValue / secondValue) * 100).toFixed(5)
    }


    private async testResult(symbolData: TestSymbolWalletInterface) {
        const positions = this.positions.filter(value => value.status)
        console.log(positions)

        const profit = positions.reduce((acc, prev) => (acc+(prev?.profit||0)), 0);
        this._logger.result(`Count deals = ${positions.length}, Deals in plus = ${positions.filter(v => v.profit! > 0).length} , Deals in minus = ${positions.filter(v => v.profit! < 0).length}`)
        this._logger.result(`Total ${this.symbolWallet.baseAsset} profit = ${profit}, percent = ${this._calcPercent(profit, symbolData.valueBaseAsset)}`)
    }

    async calcResult(): Promise<string> {
        const orders = await this._orderRepository.getCloseOrders(StrategyEnum.DiffVolume);
        if (!orders.length) return 'Not close orders';
        let result = `
        Start strategy: ${orders[0].timeOpen}
        Count deals = ${orders.length}, Deals in plus = ${orders.filter(v => v.profit! > 0).length} , Deals in minus = ${orders.filter(v => v.profit! < 0).length}`
        this._config.config.Symbols.map(value => value.symbol).forEach(symbol => {
            const ordersPair = orders.filter(value => value.symbol === symbol)
            result = `${result}
            Total ${symbol} profit = ${ordersPair.reduce((a, c) => (a + (c.profit || 0)), 0).toFixed(6)}, percent from deals = ${ordersPair.reduce((a, c) => (a + (c.profitPercent || 0)), 0).toFixed(6)}`
        })
        return this._config.config.Symbols.length === 1 ? result : `${result}
        Summ deals percent = ${orders.reduce((a, p) => (a + (p.profitPercent || 0)), 0).toFixed(6)}`
    }
}
