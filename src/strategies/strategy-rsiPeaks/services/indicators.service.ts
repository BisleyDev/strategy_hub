import {HistoryBarsService} from "../../../api/binance/history-bars.service";
import TA from 'ta-math';
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {id, inject, injectable} from "inversify";
import 'reflect-metadata';
import {ApiModuleEnum} from "../../../api/api-module.enum";
import {HistoryBarsParamsInterface} from "../../../shared/types/history-bars-params.interface";
import {TALib} from "talib.ts";
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {InstanceStrategyEnum} from "../../../shared/types/instance-strategy.enum";
import {ParserService} from "../../../shared/services/parser.service";



@injectable()
export class IndicatorsService {
    private _symbol: string;
    private _historyMACD: { line: number[], hist: number[], signal: number[] } | null = null;
    private _historyData: Array<Array<number | string>>;
    private _timeFirstClose: number;
    private testCounter: number = 0;
    private instance: InstanceStrategyEnum;
    private _historyRSI: number[] = [];
    private _historySMA: number[] = [];
    private _historyForMath: Array<Array<number | string>>;


    constructor(
        @inject(ApiModuleEnum.historyBars) private _historyBars: HistoryBarsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
        @inject(SharedModuleEnum.parser) private _parser: ParserService,
    ) {
    }

    private async MACDHistory() {
        const {fast, slow, signal, interval} = this._configService.config.pinBar.MACD;

        const params: HistoryBarsParamsInterface = {
            symbol: this._symbol,
            interval, limit: 1000
        };
        const defaultDelay = 500;
        const beforeHistory = defaultDelay + slow;
        if (this.isTest) {
            const millisecondsInInterval = this._parser.parseIntervalToMilliseconds(interval);
            const rangeDate = Date.now() - this.getStartTimeForTest();
            params.limit = Math.ceil((rangeDate / millisecondsInInterval)) + defaultDelay
        }
        const history = await this._historyBars.getHistoryBars(params);
        this._timeFirstClose = +history[beforeHistory][BarRespEnum.closeTime];
        const closePrice = history.map(value => +value[BarRespEnum.closePrice]);
        const macdTL = TALib.macd(closePrice, fast, slow, signal);
        // @ts-ignore
        const parse = (item: string): number[] =>  macdTL[item].getValue().slice(beforeHistory).map((value) => value || 0);

        this._historyMACD = {
            line: parse('macd'),
            hist: parse('macdHist'),
            signal: parse('macdSignal')
        }
    }

    private async _getHistoryRSI() {
        const interval = this._configService.config.RsiPeaks.RSI.interval;
        const params: HistoryBarsParamsInterface = {
            symbol: this._symbol,
            interval, limit: 1000
        };
        const defaultDelay = 500;
        const beforeHistory = defaultDelay + this._configService.config.RsiPeaks.RSI.length;
        if (this.isTest) {
            const millisecondsInInterval = this._parser.parseIntervalToMilliseconds(interval);
            const rangeDate = Date.now() - this.getStartTimeForTest();
            params.limit = Math.ceil((rangeDate / millisecondsInInterval)) + defaultDelay
        }
        const history = interval === this._configService.config.RsiPeaks.interval ? this._historyForMath : await this._historyBars.getHistoryBars(params).then(value => value.slice(0, -1));
        const closePrice = history.map(value => +value[BarRespEnum.closePrice]);

        this._historyRSI = TA.rsi(closePrice, this._configService.config.RsiPeaks.RSI.length)
        this.SMAHistoryForRsi()
    }

    private SMAHistoryForRsi() {
        const idx = this._configService.config.env !== "prod" ? 0 : this._historyForMath.length - this._historyData.length

        this._historySMA = (TALib.sma(this._historyRSI, this._configService.config.RsiPeaks.RSI.SMA_length).sma.getValue().slice(idx) as number[])
        this._historyRSI = this._historyRSI.slice(idx)
        // console.log(`RSI_last: ${this._historyRSI[this._historyRSI.length - 1]}, RSI_prev: ${this._historyRSI[this._historyRSI.length - 2]}, SMA_last: ${this._historySMA[this._historySMA.length - 1]}, SMA_prev: ${this._historySMA[this._historySMA.length - 2]}`)
    }


    private async _getHistoryData() {
        const interval = this._configService.config.RsiPeaks.interval;
        const params: HistoryBarsParamsInterface = {
            symbol: this._symbol,
            interval, limit: 1000
        };
        const defaultDelay = 500;
        if (this.isTest) {
            const millisecondsInInterval = this._parser.parseIntervalToMilliseconds(interval);
            const rangeDate = Date.now() - this.getStartTimeForTest();
            params.limit = Math.ceil((rangeDate / millisecondsInInterval)) + defaultDelay
        }
        this._historyForMath = await this._historyBars.getHistoryBars(params).then(value => value.slice(0, -1));
        this._historyData = this._historyForMath.slice(defaultDelay)
        this._timeFirstClose = +this._historyData[0][BarRespEnum.closeTime]
    }

    private getStartTimeForTest() {
        const millisecondsInTimeFrame = this._parser.parseIntervalToMilliseconds(this._configService.config.RsiPeaks.RSI.interval);
        const rangeDate = new Date(this._configService.config.test_env.fromDate).valueOf() - millisecondsInTimeFrame * (this._configService.config.RsiPeaks.RSI.length + 1);
        return Math.round((rangeDate / millisecondsInTimeFrame) * millisecondsInTimeFrame)
    }

    public async updateData() {
        await this._getHistoryData();
        await this._getHistoryRSI()
        this.testCounter = 0;
    }

    public async init(symbol: string, instance: InstanceStrategyEnum) {
        this._symbol = symbol;
        this.instance = instance;
        return await this.updateData();

    }

    get symbol(): string {
        return this._symbol;
    }

    get isTest(): boolean {
        return this.instance === 'test';
    }

    get historyData() {
        return this._historyData;
    }

    get historyRSI(): number[] {
        return this._historyRSI;
    }

    get historySMA(): number[] {
        return this._historySMA;
    }

    get currentBar(): Array<number | string> {
        return this._historyData[this.index]
    }

    get index() {
        return this.isTest ? this.testCounter : this.historyData.length - 1;
    }

    increaseCounter() {
        this.testCounter += 1;
    }

}
