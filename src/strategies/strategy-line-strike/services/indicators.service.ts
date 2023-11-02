import {HistoryBarsService} from "../../../api/binance/history-bars.service";
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
        const {fast, slow, signal, interval} = this._configService.config.lineStrike.MACD;

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
        const history = await this._historyBars.getHistoryBars(params).then(value => value.slice(0, -1));
        this._timeFirstClose = +history[beforeHistory][BarRespEnum.closeTime];
        const closePrice = history.map(value => +value[BarRespEnum.closePrice]);
        const macdTL = TALib.macd(closePrice, fast, slow, signal);
        // @ts-ignore
        const parse = (item: string): number[] => macdTL[item].getValue().slice(beforeHistory).map((value) => +value || 0);

        this._historyMACD = {
            line: parse('macd'),
            hist: parse('macdHist'),
            signal: parse('macdSignal')
        }

        if (this._configService.config.lineStrike.interval !== this._configService.config.lineStrike.MACD.interval) {
            const countIntervalInMACDInterval = this._parser.parseIntervalToMilliseconds(this._configService.config.lineStrike.MACD.interval) / this._parser.parseIntervalToMilliseconds(this._configService.config.lineStrike.interval)
            const delta = 1 / countIntervalInMACDInterval;
            const calc = (calcArray: number[]): number[] => {
                const arr: number[] = [];
                calcArray.forEach((hist, idx, array) => {

                    arr.push(hist)
                    for (let i = 1; i < countIntervalInMACDInterval - 1; i++) {
                        const value = (array[idx] + (delta * i) * array[idx + 1]) / (1 + (delta * i))
                        arr.push(value)
                    }
                })
                return arr
            }
            this._historyMACD = {
                hist: calc(this._historyMACD.hist),
                line: calc(this._historyMACD.line),
                signal: calc(this._historyMACD.signal)
            }
            debugger
        }
    }


    private async _getHistoryData() {
        const interval = this._configService.config.lineStrike.interval;
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
        const history = await this._historyBars.getHistoryBars(params).then(value => value.slice(0, -1));
        this._historyData = history.slice(history.findIndex(el => el[BarRespEnum.closeTime] === this._timeFirstClose))
    }

    private getStartTimeForTest() {
        const millisecondsInTimeFrame = this._parser.parseIntervalToMilliseconds(this._configService.config.lineStrike.MACD.interval);
        const rangeDate = new Date(this._configService.config.test_env.fromDate).valueOf() - millisecondsInTimeFrame * (this._configService.config.lineStrike.MACD.slow + 1);
        return Math.round((rangeDate / millisecondsInTimeFrame) * millisecondsInTimeFrame)
    }

    public async updateData() {
        this._historyMACD = null;
        await this.MACDHistory();
        await this._getHistoryData();
        this.testCounter = 4;
    }

    public async init(symbol: string, instance: InstanceStrategyEnum) {
        this._symbol = symbol;
        this.instance = instance;
        return await this.updateData();

    }

    get symbol(): string {
        return this._symbol;
    }

    get historyMACD(): { line: number[], hist: number[], signal: number[] } | null {
        // if (this.isTest) {
        //     return this._testHistoryMACD()
        // }

        return this._historyMACD;
    }

    private _testHistoryMACD(): { line: number[], hist: number[], signal: number[] } | null {
        if (!this._historyMACD) return null;
        if (this._configService.config.lineStrike.interval === this._configService.config.lineStrike.MACD.interval) {
            return {
                signal: this._historyMACD.signal.slice(0, this.testCounter),
                line: this._historyMACD.line.slice(0, this.testCounter),
                hist: this._historyMACD.hist.slice(0, this.testCounter),
            }
        }
        const get2LastValues = (arr: number[]): number[] => {
            const countRSIIntervalInMACDInterval = this._parser.parseIntervalToMilliseconds(this._configService.config.lineStrike.MACD.interval) / this._parser.parseIntervalToMilliseconds(this._configService.config.lineStrike.interval)
            const idx = Math.floor(this.testCounter / countRSIIntervalInMACDInterval);
            const delta = this.testCounter % countRSIIntervalInMACDInterval
            const value = (arr[idx] + delta * arr[idx + 1]) / (1 + delta)
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
        return this._historyData[this.index]
    }

    get index() {
        return this.isTest ? this.testCounter : this.historyData.length - 1;
    }

    increaseCounter() {
        this.testCounter += 1;
    }

}
