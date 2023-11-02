import {HistoryBarsService} from "../../../api/binance/history-bars.service";
import TA from 'ta-math';
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {inject, injectable} from "inversify";
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
    private _historyRSI: number[] = [];
    private _historyMACD: { line: number[], hist: number[], signal: number[] } | null = null;
    private _historyData: Array<Array<number | string>>;
    private _timeFirstClose: number;
    private testCounter: number = 0;
    private instance: InstanceStrategyEnum;


    constructor(
        @inject(ApiModuleEnum.historyBars) private _historyBars: HistoryBarsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
        @inject(SharedModuleEnum.parser) private _parser: ParserService,
    ) {
    }

    private async MACDHistory() {
        const {fast, slow, signal, interval} = this._configService.config.strategy2.MACD;

        const params: HistoryBarsParamsInterface = {
            symbol: this._symbol,
            interval, limit: 1000
        };
        const defaultDelay = 500;
        const beforeHistory = defaultDelay + this._configService.config.strategy2.MACD.slow;
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
        console.log(`MACD_line: ${this.historyMACD?.line[this.historyMACD?.line.length - 1]}; MACD_hist: ${this.historyMACD?.hist[this.historyMACD?.hist.length - 1]}`)
    }

    private async RSIHistory() {
        const interval = this._configService.config.strategy2.RSI.interval;
        const params: HistoryBarsParamsInterface = {
            symbol: this._symbol,
            interval, limit: 1000
        }
        if (this.isTest) {
            const millisecondsInInterval = this._parser.parseIntervalToMilliseconds(interval);
            const delay = new Date(this._configService.config.test_env.fromDate).valueOf() - millisecondsInInterval * (this._configService.config.strategy2.RSI.length + 200);
            const rangeDate = Date.now() - delay
            params.limit = Math.round((rangeDate / millisecondsInInterval))
        }
        const history = await this._historyBars.getHistoryBars(params);
        const closePrice = history.map(value => +value[BarRespEnum.closePrice]).slice(0, -1)

        this._historyRSI = TA.rsi(closePrice, this._configService.config.strategy2.RSI.length)
        this._historyData = history.slice(history.findIndex(el => el[BarRespEnum.closeTime] === this._timeFirstClose))
    }

    private getStartTimeForTest() {
        const millisecondsInTimeFrame = this._parser.parseIntervalToMilliseconds(this._configService.config.strategy2.MACD.interval);
        const rangeDate = new Date(this._configService.config.test_env.fromDate).valueOf() - millisecondsInTimeFrame * (this._configService.config.strategy2.MACD.slow + 1);
        return Math.round((rangeDate / millisecondsInTimeFrame) * millisecondsInTimeFrame)
    }

    public async updateData() {
        this._historyRSI  = [];
        this._historyMACD = null;
        await this.MACDHistory();
        await this.RSIHistory();
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

    get historyRSI(): number[] {
        if (this.isTest) {
            return this._historyRSI.slice(0, this.testCounter + 1);
        } else {
            return this._historyRSI
        }

    }

    get historyMACD(): { line: number[], hist: number[], signal: number[] } | null {
        if (this.isTest) {
            return this._testHistoryMACD()
        }

        return this._historyMACD;
    }

    private _testHistoryMACD(): { line: number[], hist: number[], signal: number[] } | null {
        if (!this._historyMACD) return null;
        const get2LastValues = (arr: number[]): number[]  => {
            const countRSIIntervalInMACDInterval = this._parser.parseIntervalToMilliseconds(this._configService.config.strategy2.MACD.interval) / this._parser.parseIntervalToMilliseconds(this._configService.config.strategy2.RSI.interval)
            const idx = Math.floor(this.testCounter / countRSIIntervalInMACDInterval);
            const delta = this.testCounter % countRSIIntervalInMACDInterval
            const value = (arr[idx] + delta * arr[idx+1]) / (1 + delta)
            return [arr[idx], value]
        }

        return {
            line: get2LastValues(this._historyMACD?.line),
            hist: get2LastValues(this._historyMACD?.hist),
            signal: get2LastValues(this._historyMACD?.signal)
        }
    }

    get isTest(): boolean {
        return this.instance === 'test';
    }

    get historyData() {
        return this._historyData;
    }

    get currentBar(): Array<number | string> {
        return this._historyData[this.testCounter]
    }

    get index() {
        return this.testCounter;
    }

    increaseCounter() {
        this.testCounter += 1;
    }

}
