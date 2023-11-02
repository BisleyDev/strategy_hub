import {inject, injectable} from "inversify";
import 'reflect-metadata';

import {InstanceStrategyEnum} from "../../../shared/types/instance-strategy.enum";
import {ApiModuleEnum} from "../../../api/api-module.enum";
import {HistoryBarsService} from "../../../api/binance/history-bars.service";
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {ParserService} from "../../../shared/services/parser.service";
import {HistoryBarsParamsInterface} from "../../../shared/types/history-bars-params.interface";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {CandleSideEnum} from "../../../shared/types/candleSide.enum";
import {BuySellVolumeInterface} from "../types/buy-sell-volume.interface";

@injectable()
export class IndicatorsService {
    private _symbol: string;
    private _historyData: Array<Array<number | string>>;
    private _buySellVolume: Array<BuySellVolumeInterface>;
    private _pureVolumes: Array<{ summ: number, sell: number, buy: number, side: CandleSideEnum }>
    private _timeFirstClose: number;
    private testCounter: number = 0;
    private instance: InstanceStrategyEnum;


    constructor(
        @inject(ApiModuleEnum.historyBars) private _historyBars: HistoryBarsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
        @inject(SharedModuleEnum.parser) private _parser: ParserService,
    ) {
    }

    private async _getHistoryData() {
        const interval = this._configService.config.DiffVolume.interval;
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
        this._historyData = await this._historyBars.getHistoryBars(params).then(value => value.slice(0, -1));
        // this._historyData = history.slice(history.findIndex(el => el[BarRespEnum.closeTime] === this._timeFirstClose))
    }

    private _getPureVolumes() {
        this._pureVolumes = this._historyData.map(candle => {
            let res = {
                summ: +candle[BarRespEnum.volume],
                sell: 0, buy: Math.ceil(+candle[BarRespEnum.volumeBaseAssets]), side: CandleSideEnum.GREEN
            };
            res.sell = Math.ceil(res.summ - res.buy);
            res.side = res.buy > res.sell ? CandleSideEnum.GREEN : CandleSideEnum.RED;
            return res;

        })
    }

    private _calcBuySellVolume() {
        this._buySellVolume = this._historyData.map((current, index, array) => {
            let patternParams = {
                barSide: (+current[BarRespEnum.closePrice] - +current[BarRespEnum.openPrice]) > 0 ? CandleSideEnum.GREEN : CandleSideEnum.RED,
                volumeSideBuy: +current[BarRespEnum.volume] * (+current[BarRespEnum.closePrice] - +current[BarRespEnum.lowPrice]) / (+current[BarRespEnum.highPrice] - +current[BarRespEnum.lowPrice]),
                volumeSideSell: +current[BarRespEnum.volume] * (+current[BarRespEnum.highPrice] - +current[BarRespEnum.closePrice]) / (+current[BarRespEnum.highPrice] - +current[BarRespEnum.lowPrice]),
                volumeSide: CandleSideEnum.GREEN
            }
            patternParams.volumeSide = patternParams.volumeSideBuy - patternParams.volumeSideSell > 0 ? CandleSideEnum.GREEN : CandleSideEnum.RED

            return patternParams;
        })
    }

    private getStartTimeForTest() {
        const millisecondsInTimeFrame = this._parser.parseIntervalToMilliseconds(this._configService.config.DiffVolume.interval);
        const rangeDate = new Date(this._configService.config.test_env.fromDate).valueOf() - millisecondsInTimeFrame * (this._configService.config.DiffVolume.volume.MA + 1);
        return Math.round((rangeDate / millisecondsInTimeFrame) * millisecondsInTimeFrame)
    }

    public async updateData() {
        await this._getHistoryData();
        this.defaultTestValue();
        this._calcBuySellVolume();
        this._getPureVolumes();
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

    get currentBar(): Array<number | string> {
        return this._historyData[this.index]
    }

    get index() {
        return this.isTest ? this.testCounter : this.historyData.length - 1;
    }

    get BSV() {
        return this._buySellVolume;
    }

    get PureVolumes() {
        return this._pureVolumes;
    }

    increaseCounter() {
        this.testCounter += 1;
    }

    defaultTestValue() {
        this.testCounter = this._historyData.findIndex((candle) => candle[BarRespEnum.openTime] === (new Date(this._configService.config.test_env.fromDate).valueOf()))
    }

    averageVolumeByCurrentBar(): number {
        const arr = this.historyData.slice(this.index - this._configService.config.DiffVolume.volume.MA, this.index)
            .map(el => +el[BarRespEnum.volume])

        return arr.reduce((previousValue, currentValue) => (previousValue + currentValue), 0) / arr.length
    }

}
