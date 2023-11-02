import {inject, injectable} from "inversify";
import {PositionInterface} from "../../../shared/types/position.interface";
import {Strategy2ModuleEnum} from "../strategy2.module.enum";
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
import {ApiModuleEnum} from "../../../api/api-module.enum";
import {ExchangeInfoService} from "../../../api/binance/exchange-info.service";
import {BinanceClientService} from "../../../api/binance/binance-client.service";
import {TestSymbolWalletInterface} from "../../../shared/types/testSymbolWallet.interface";
import {ParserService} from "../../../shared/services/parser.service";
import {TelegramBotService} from "../../../shared/telegram-bot/telegram-bot.service";
import {TelegramCommandsEnum} from "../../../shared/types/telegram-commands.enum";
import {StrategyEnum} from "../../../shared/types/strategy.enum";
import {PositionsRepositoryService} from "../../../shared/services/positions.repository.service";


@injectable()
export class Strategy2Service {
    positions: PositionInterface[] = [];
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
        @inject(Strategy2ModuleEnum.strategy2Signals) private _signals: SignalsService,
        @inject(Strategy2ModuleEnum.strategy2Indicators) private _indicators: IndicatorsService,
        @inject(ApiModuleEnum.exchangeInfo) private _exchangeInfo: ExchangeInfoService,
        @inject(ApiModuleEnum.binanceClient) private _binanceClient: BinanceClientService,
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
        @inject(SharedModuleEnum.config) private _config: ConfigService,
        @inject(SharedModuleEnum.positionRepository) private _positionRepository: PositionsRepositoryService,
        @inject(SharedModuleEnum.parser) private _parser: ParserService,
        @inject(SharedModuleEnum.telegramBot) private _telegramBot: TelegramBotService,
    ) {
        this.init();
    }

    async init() {
        this._telegramBot.bot.on('message', (msg: any) => {
            if (msg.text === TelegramCommandsEnum.check_last_time) {
                this._telegramBot.sendMessage("Last check: " + this.lastTimeCheckStrategy)
            }
            if (msg.text === TelegramCommandsEnum.open_positions) {
                this._positionRepository.getAllOpenPositions().then(value => {
                    this._telegramBot.sendMessage('Open positions: ' + JSON.stringify(value))
                });
            }
        })
    }

    async startStrategy() {
        clearInterval(this.idInterval);
        const time = new Date().toString();
        console.log(time)
        this.lastTimeCheckStrategy = time;
        this.instance = InstanceStrategyEnum.PROD;
        const symbolData = this._config.config.Symbols;
        await this.checkBySymbols(symbolData, 0);
        this.startNextCheckStrategy()
    }

    private startNextCheckStrategy() {
        const timeNow = Date.now();
        const millisecondsInPeriod = this._parser.parseIntervalToMilliseconds(this._config.config.Indicators_Params.RSI.interval);
        const delayCloseBar = 1000 * 30;
        const nextCheck = Math.ceil(timeNow / millisecondsInPeriod) * millisecondsInPeriod - timeNow + delayCloseBar
        this.idInterval = setTimeout(async () => {
            await this.startStrategy();
        }, nextCheck)
    }


    async startTestStrategy(data: TestSymbolWalletInterface[]) {
        this.instance = InstanceStrategyEnum.TEST;
        await this.checkBySymbols(data, 0)
    }

    private async checkBySymbols(data: TestSymbolWalletInterface[], indexSymbol: number) {
        const symbolData = data[indexSymbol]
        if (!symbolData) return
        await this._indicators.init(symbolData.symbol, this.instance);
        this.symbolWallet = {...symbolData};
        this.positions = [];

        if (this.instance === InstanceStrategyEnum.PROD) {
            console.log(`TREND: ${this._signals.trend()}`)
            await this.checkSignal();
        }
        if (this.instance === InstanceStrategyEnum.TEST) {
            while (this._indicators.index < this._indicators.historyData.length) {
                await this.checkSignal();
                this._indicators.increaseCounter();
            }

            await this.testResult(data[indexSymbol])
        }

        await this.checkBySymbols(data, indexSymbol + 1)
    }

    private async checkSignal() {
        const openPosition = await this.getOpenPosition();

        if (openPosition && openPosition.side === SideOrderEnum.BUY) {
            if (this._signals.signalStopLongPosition() ||
                this._signals.signalCloseLongPosition() ||
                this._signals.stopLimitLongPosition(openPosition.priceOpen)
            ) {
                await this.closeLongPosition(openPosition)
            }
        }

        if (openPosition && openPosition.side === SideOrderEnum.SELL) {
            if (this._signals.signalCloseShortPosition() ||
                this._signals.signalStopShortPosition() ||
                this._signals.stopLimitShortPosition(openPosition.priceOpen)
            ) {
                await this.closeShortPosition(openPosition)
            }
        }

        if (!openPosition && this._signals.signalOpenLongPosition()) {
            await this.openLongPosition(this.symbolWallet.symbol)
        }

        if (!openPosition && this._signals.signalOpenShortPosition()) {
            await this.openShortPosition(this.symbolWallet.symbol)
        }
    }

    private async openLongPosition(symbol: string) {
        if (this.instance === InstanceStrategyEnum.PROD) {
            const {baseAsset, quoteAsset} = await this._exchangeInfo.getSymbolsInfo(symbol);
            const wallet = await this._binanceClient.getFreeAmountByAsset(quoteAsset);
            const sizePosition = wallet * this.percentDeal
            const result = await this._binanceClient.newOrderMarket({
                symbol,
                side: SideOrderEnum.BUY,
                quoteOrderQty: sizePosition
            });
            if (!result) {
                return
            }
            const position: PositionInterface = {
                symbol,
                side: SideOrderEnum.BUY,
                priceOpen: result.price,
                timeOpen: new Date(result.time),
                status: StatusPositionsEnum.OPEN,
                fee: result.commission,
                feeAsset: result.commissionAsset,
                id: result.orderId,
                sizeBase: result.qty,
                sizeQuote: result.quoteQty,
                profit: null,
                feeClose: null,
                priceClose: null,
                profitPercent: null,
                timeClose: null,
                account: this._config.config.Indicators_Params.account,
                strategy: StrategyEnum.strategy2
            }
            await this._positionRepository.openPosition(position)
            this._logger.result('openLongPosition: ' + position);
        } else {
            const currentBar = this._indicators.currentBar;
            const position: PositionInterface = {
                id: uuidv4(),
                side: SideOrderEnum.BUY,
                status: StatusPositionsEnum.OPEN,
                feeAsset: this.symbolWallet.quoteAsset,
                symbol: this.symbolWallet.symbol,
                priceOpen: +currentBar[BarRespEnum.openPrice],
                sizeQuote: this.symbolWallet.valueQuoteAsset * this.percentDeal,
                timeOpen: new Date(currentBar[BarRespEnum.openTime]),
                feeClose: null,
                priceClose: null,
                profit: null,
                profitPercent: null,
                timeClose: null,
                sizeBase: 0,
                fee: 0,
                account: this._config.config.Indicators_Params.account,
                strategy: StrategyEnum.strategy2
            }
            position.sizeBase = position.sizeQuote / position.priceOpen;
            position.fee = position.sizeQuote * (0.1 / 100)

            this.symbolWallet.valueBaseAsset += position.sizeBase;
            this.symbolWallet.valueQuoteAsset -= position.sizeQuote;
            this.positions.push(position);
        }

    }

    private async closeLongPosition(openPosition: PositionInterface) {

        openPosition.status = this._signals.signalStopLongPosition() ? StatusPositionsEnum.CLOSED_BY_CHANGE_TREND : StatusPositionsEnum.CLOSED_BY_SIGNAL;
        if (this._signals.stopLimitLongPosition(openPosition.priceOpen)) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT


        if (this.instance === InstanceStrategyEnum.PROD) {
            const result = await this._binanceClient.newOrderMarket({
                symbol: openPosition.symbol,
                side: SideOrderEnum.SELL,
                quoteOrderQty: openPosition.sizeQuote
            });
            openPosition.timeClose = result ? new Date(result.time) : new Date();
            openPosition.priceClose = result!.price;
            openPosition.feeClose = result!.commission;
            openPosition.feeAsset = result!.commissionAsset;
            openPosition.profit = openPosition.sizeBase - result!.qty;
            await this._positionRepository.closePosition(openPosition)
        } else {
            const currentBar = this._indicators.currentBar;
            openPosition.timeClose = new Date(currentBar[BarRespEnum.closeTime]);
            openPosition.priceClose = +currentBar[BarRespEnum.closePrice];

            const deal = openPosition.sizeQuote / openPosition.priceClose;

            openPosition.profit = openPosition.sizeBase - deal;
            openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            openPosition.feeClose = deal * (0.1 / 100)

            this.symbolWallet.valueBaseAsset -= deal;
            this.symbolWallet.valueQuoteAsset += openPosition.sizeQuote;
        }
        this._logger.result(openPosition)


    }

    private async openShortPosition(symbol: string) {
        if (this.instance === InstanceStrategyEnum.PROD) {
            const {baseAsset, quoteAsset} = await this._exchangeInfo.getSymbolsInfo(symbol);
            const wallet = await this._binanceClient.getFreeAmountByAsset(quoteAsset);
            const sizePosition = wallet * this.percentDeal
            const result = await this._binanceClient.newOrderMarket({
                symbol,
                side: SideOrderEnum.SELL,
                quoteOrderQty: sizePosition
            });
            if (!result) {
                this._logger.error('Error open short position');
                return
            }
            const position: PositionInterface = {
                symbol,
                side: SideOrderEnum.SELL,
                priceOpen: result.price,
                timeOpen: new Date(result.time),
                status: StatusPositionsEnum.OPEN,
                fee: result.commission,
                feeAsset: result.commissionAsset,
                id: result.orderId,
                sizeBase: result.qty,
                sizeQuote: result.quoteQty,
                profit: null,
                feeClose: null,
                priceClose: null,
                profitPercent: null,
                timeClose: null,
                account: this._config.config.Indicators_Params.account,
                strategy: StrategyEnum.strategy2
            }
            await this._positionRepository.openPosition(position);
            this._logger.result('openShortPosition: ' + position);

        } else {
            const currentBar = this._indicators.currentBar;
            const position: PositionInterface = {
                id: uuidv4(),
                side: SideOrderEnum.SELL,
                status: StatusPositionsEnum.OPEN,
                feeAsset: this.symbolWallet.baseAsset,
                symbol: this.symbolWallet.symbol,
                priceOpen: +currentBar[BarRespEnum.openPrice],
                sizeBase: this.symbolWallet.valueBaseAsset * this.percentDeal,
                timeOpen: new Date(currentBar[BarRespEnum.openTime]),
                feeClose: null,
                priceClose: null,
                profit: null,
                profitPercent: null,
                timeClose: null,
                sizeQuote: 0,
                fee: 0,
                account: this._config.config.Indicators_Params.account,
                strategy: StrategyEnum.strategy2
            }
            position.sizeQuote = position.priceOpen * position.sizeBase;
            position.fee = position.sizeQuote * (0.1 / 100)

            this.symbolWallet.valueBaseAsset -= position.sizeBase;
            this.symbolWallet.valueQuoteAsset += position.sizeQuote;
            this.positions.push(position)
        }
    }

    private async closeShortPosition(openPosition: PositionInterface) {

        if (this.instance === InstanceStrategyEnum.PROD) {
            const result = await this._binanceClient.newOrderMarket({
                symbol: openPosition.symbol,
                side: SideOrderEnum.BUY,
                quoteOrderQty: openPosition.sizeQuote
            });
            openPosition.timeClose = result ? new Date(result.time) : new Date();
            openPosition.priceClose = result!.price;
            openPosition.feeClose = result!.commission;
            openPosition.feeAsset = result!.commissionAsset;
            openPosition.profit = openPosition.sizeBase - result!.qty;
            openPosition.status = this._signals.signalStopShortPosition() ? StatusPositionsEnum.CLOSED_BY_CHANGE_TREND : StatusPositionsEnum.CLOSED_BY_SIGNAL;
            if (this._signals.stopLimitShortPosition(openPosition.priceOpen)) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT

            await this._positionRepository.closePosition(openPosition)
        } else {
            const currentBar = this._indicators.currentBar;
            openPosition.timeClose = new Date(currentBar[BarRespEnum.closeTime]);
            openPosition.priceClose = +currentBar[BarRespEnum.closePrice];

            const deal = openPosition.sizeQuote / openPosition.priceClose;

            openPosition.profit = deal - openPosition.sizeBase;
            openPosition.profitPercent = this._calcPercent(openPosition.profit, openPosition.sizeBase);
            openPosition.feeClose = deal * (0.1 / 100)

            this.symbolWallet.valueBaseAsset += deal;
            this.symbolWallet.valueQuoteAsset -= openPosition.sizeQuote;
            openPosition.status = this._signals.signalStopShortPosition() ? StatusPositionsEnum.CLOSED_BY_CHANGE_TREND : StatusPositionsEnum.CLOSED_BY_SIGNAL;
            if (this._signals.stopLimitShortPosition(openPosition.priceOpen)) openPosition.status = StatusPositionsEnum.CLOSED_BY_STOP_LIMIT
            this._logger.result(openPosition, this.symbolWallet)
        }
    }

    private async getOpenPosition(): Promise<PositionInterface | null> {
        if (this.instance === InstanceStrategyEnum.TEST) {
            return this.positions.find(value => value.status === StatusPositionsEnum.OPEN) || null;
        } else {
            return this._positionRepository.findOpenPosition(this.symbolWallet.symbol)
        }
    }

    private _calcPercent(firstValue: number, secondValue: number): number {
        return +((firstValue / secondValue) * 100).toFixed(2)
    }

    private async testResult(symbolData: TestSymbolWalletInterface) {
        this._logger.result(await this.getOpenPosition())
        // @ts-ignore
        const profit = (a: string) => this.symbolWallet[a] - symbolData[a]
        this._logger.result(`Count deals = ${this.positions.length}, Deals in plus = ${this.positions.filter(v => v.profit! > 0).length} , Deals in minus = ${this.positions.filter(v => v.profit! < 0).length}`)
        this._logger.result(`Total ${this.symbolWallet.baseAsset} profit = ${profit('valueBaseAsset')}, percent = ${this._calcPercent(profit('valueBaseAsset'), symbolData.valueBaseAsset)}`)
        this._logger.result(`Total ${this.symbolWallet.quoteAsset} profit = ${(profit('valueQuoteAsset')).toFixed(2)}, percent = ${this._calcPercent(profit('valueQuoteAsset'), symbolData.valueQuoteAsset)}`)
        this._logger.result(`Summ deals percent = ${this.positions.reduce((previousValue, currentValue) => (previousValue + currentValue.profitPercent!), 0).toFixed(2)}`)
        this._logger.result(`Summ deals profit = ${this.positions.reduce((previousValue, currentValue) => (previousValue + currentValue.profit!), 0)}`);
    }
}
