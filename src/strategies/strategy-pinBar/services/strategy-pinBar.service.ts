import {inject, injectable} from "inversify";
import {SignalsService} from "./signals.service";
import {IndicatorsService} from "./indicators.service";
import 'reflect-metadata';
import {StatusPositionsEnum} from "../../../shared/types/status-positions.enum";
import {SideOrderEnum} from "../../../shared/types/side-order.enum";
import {v4 as uuidv4} from 'uuid';
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {LoggerService} from "../../../shared/logger/logger.service";
import {ConfigService} from "../../../shared/config/config.service";
import {InstanceStrategyEnum} from "../../../shared/types/instance-strategy.enum";
import {TestSymbolWalletInterface} from "../../../shared/types/testSymbolWallet.interface";
import {TelegramBotService} from "../../../shared/telegram-bot/telegram-bot.service";
import {StrategyEnum} from "../../../shared/types/strategy.enum";
import {OrderTakeStopInterface} from "../../../shared/types/position.interface";
import {StrategyPinBarModuleEnum} from "../strategy-pinBar-module.enum";
import {OrderTakeStopRepositoryService} from "../../../shared/services/OrderTakeStop.repository.service";
import {ApiModuleEnum} from "../../../api/api-module.enum";
import {BinanceMarginClientService} from "../../../api/binance/binance-margin-client.service";
import {TelegramCommandsEnum} from "../../../shared/types/telegram-commands.enum";
import {ParserService} from "../../../shared/services/parser.service";


@injectable()
export class StrategyPinBarService {
    positions: OrderTakeStopInterface[] = [];
    instance: InstanceStrategyEnum = InstanceStrategyEnum.TEST;
    idInterval: NodeJS.Timer;
    percentDeal = 0.5;
    symbolWallet = {
        symbol: "",
        baseAsset: "",
        quoteAsset: "",
        valueBaseAsset: 0,
        valueQuoteAsset: 0
    }

    private lastTimeCheckStrategy = '';

    constructor(
        @inject(StrategyPinBarModuleEnum.PinBarSignals) private _signals: SignalsService,
        @inject(StrategyPinBarModuleEnum.PinBarIndicators) private _indicators: IndicatorsService,
        @inject(ApiModuleEnum.binanceMarginClient) private _binanceMarginClient: BinanceMarginClientService,
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
        @inject(SharedModuleEnum.config) private _config: ConfigService,
        @inject(SharedModuleEnum.orderTakeStopRepository) private _orderRepository: OrderTakeStopRepositoryService,
        @inject(SharedModuleEnum.parser) private _parser: ParserService,
        @inject(SharedModuleEnum.telegramBot) private _telegramBot: TelegramBotService,
    ) {
        this.init();
    }

    async init() {
        this._telegramBot.bot.on('message', (msg: any) => {
            if (msg.text === TelegramCommandsEnum.check_last_time) {
                this._telegramBot.sendMessage("[pin bar] Last check: " + this.lastTimeCheckStrategy)
            }
            if (msg.text === TelegramCommandsEnum.open_positions) {
                this._orderRepository.getAllOpenPositions().then(value => {
                    this._telegramBot.sendMessage('[pin bar] Open positions: ' + JSON.stringify(value))
                });
            }
            if (msg.text === TelegramCommandsEnum.summ_result) {
                (async () => {
                    const res = await this.calcResult();
                    this._telegramBot.sendMessage('[pin bar] result: ' + res)
                })()
            }
            if (msg.text === TelegramCommandsEnum.clear_data) {
                this._orderRepository.clearData(StrategyEnum.strategyPinBar)
                this._telegramBot.sendMessage('[pin bar] Data cleaned')
            }
            if (msg.text === TelegramCommandsEnum.close_position) {
                this.checkSignal(true);
                this._telegramBot.sendMessage('[pin bar] Handle close position')
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
        const millisecondsInPeriod = this._parser.parseIntervalToMilliseconds(this._config.config.pinBar.interval);
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

        if (
            openPosition && openPosition.side === SideOrderEnum.BUY &&
            (this._signals.signalCloseLongPosition(openPosition) || this._signals.stopLimitLongPosition(openPosition) || handleClosePosition)
        ) {
            await this.closeLongPosition(openPosition, handleClosePosition)
        }

        if (openPosition && openPosition.side === SideOrderEnum.SELL &&
            (this._signals.signalCloseShortPosition(openPosition) || this._signals.stopLimitShortPosition(openPosition) || handleClosePosition)
        ) {
            await this.closeShortPosition(openPosition, handleClosePosition)
        }

        if (this._signals.signalOpenLongPosition()) {
            await this.openLongPosition(this.symbolWallet.symbol)
        }

        if (this._signals.signalOpenShortPosition()) {
            await this.openShortPosition(this.symbolWallet.symbol)
        }
    }

    private async openLongPosition(symbol: string) {
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
            const previousBar = this._indicators.historyData[this._indicators.index - 1]
            const stopPrice = +previousBar[BarRespEnum.lowPrice];
            const takePrice = ((result.price - +previousBar[BarRespEnum.lowPrice]) * 3) + result.price;

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
                account: this._config.config.pinBar.account,
                strategy: StrategyEnum.strategyPinBar,
                stopPrice, takePrice
            }
            await this._orderRepository.openOrder(position)
            this._logger.result('[pin bar] Open Long Position: ', position);
        } else {
            const currentBar = this._indicators.currentBar;
            const previousBar = this._indicators.historyData[this._indicators.index - 1]
            const stopPrice = +previousBar[BarRespEnum.lowPrice];
            const takePrice = ((+currentBar[BarRespEnum.closePrice] - +previousBar[BarRespEnum.lowPrice]) * 3) + +currentBar[BarRespEnum.closePrice]
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
                account: this._config.config.pinBar.account,
                strategy: StrategyEnum.strategyPinBar,
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

        if (this._signals.signalCloseLongPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_TAKE;
        if (this._signals.stopLimitLongPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT;
        if (this._signals.stopLimitShortPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_USER;
        if (this.instance === InstanceStrategyEnum.PROD) {
            const result = await this._binanceMarginClient.newOrderIsolate({
                symbol: openPosition.symbol,
                side: SideOrderEnum.SELL,
                isOpenPosition: true,
                quantity: openPosition.sizeBase
            });
            if (!result) return;
            const {feeAsset, fee, sizeQuote, price, time} = result
            openPosition.timeClose = time;
            openPosition.priceClose = price;
            openPosition.feeClose = fee;
            openPosition.feeAsset = feeAsset;
            openPosition.profit = openPosition.sizeQuote - sizeQuote;
            openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            await this._orderRepository.closePosition(openPosition)
            this._logger.result('[pin bar] CLose Long position: ', openPosition)
        } else {
            const currentBar = this._indicators.currentBar;
            openPosition.timeClose = new Date(currentBar[BarRespEnum.closeTime]);
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

    private async openShortPosition(symbol: string) {
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
            const previousBar = this._indicators.historyData[this._indicators.index - 1]

            const stopPrice = +previousBar[BarRespEnum.highPrice];
            const takePrice = result.price - ((+previousBar[BarRespEnum.highPrice] - result.price) * 3)

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
                account: this._config.config.pinBar.account,
                strategy: StrategyEnum.strategyPinBar
            }
            await this._orderRepository.openOrder(position);
            this._logger.result('[pin bar] Open Short Position: ', position);

        } else {
            const currentBar = this._indicators.currentBar;
            const previousBar = this._indicators.historyData[this._indicators.index - 1]
            const stopPrice = +previousBar[BarRespEnum.highPrice];
            const takePrice = +currentBar[BarRespEnum.closePrice] - ((+previousBar[BarRespEnum.highPrice] - +currentBar[BarRespEnum.closePrice]) * 3)
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
                account: this._config.config.pinBar.account,
                strategy: StrategyEnum.strategyPinBar,
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
        if (this._signals.signalCloseShortPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_TAKE;
        if (this._signals.stopLimitShortPosition(openPosition)) openPosition.status = StatusPositionsEnum.CLOSED_BY_USER;
        if (handleClose) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT;
        if (this.instance === InstanceStrategyEnum.PROD) {
            const result = await this._binanceMarginClient.newOrderIsolate(
                {
                    symbol: openPosition.symbol,
                    isOpenPosition: true,
                    side: SideOrderEnum.BUY,
                    quantity: openPosition.sizeBase
                }
            );
            if (!result) {
                return
            }
            openPosition.timeClose = result.time;
            openPosition.priceClose = result.price;
            openPosition.feeClose = result.fee;
            openPosition.feeAsset = result.feeAsset;
            openPosition.profit = result.sizeQuote - openPosition.sizeQuote;
            openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);

            await this._orderRepository.closePosition(openPosition);
            this._logger.result('[pin bar] Close Short Position: ', openPosition)
        } else {
            const currentBar = this._indicators.currentBar;
            openPosition.timeClose = new Date(currentBar[BarRespEnum.closeTime]);
            // openPosition.priceClose = +currentBar[BarRespEnum.closePrice];
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

    private async getOpenPosition(): Promise<OrderTakeStopInterface | null> {
        if (this.instance === InstanceStrategyEnum.TEST) {
            return this.positions.find(value => value.status === StatusPositionsEnum.OPEN) || null;
        } else {
            return this._orderRepository.findOpenOrder(this.symbolWallet.symbol, StrategyEnum.strategyPinBar)
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
        const positions = this.positions.filter(value => value.status !== StatusPositionsEnum.OPEN)
        // console.log(this.positions)

        const profit = positions.reduce((acc, prev) => (acc+(prev?.profit||0)), 0);
        this._logger.result(`Count deals = ${positions.length}, Deals in plus = ${positions.filter(v => v.profit! > 0).length} , Deals in minus = ${positions.filter(v => v.profit! < 0).length}`)
        this._logger.result(`Total ${this.symbolWallet.baseAsset} profit = ${profit}, percent = ${this._calcPercent(profit, symbolData.valueBaseAsset)}`)
    }

    async calcResult(): Promise<string> {
        const orders = await this._orderRepository.getCloseOrders(StrategyEnum.strategyPinBar);
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
