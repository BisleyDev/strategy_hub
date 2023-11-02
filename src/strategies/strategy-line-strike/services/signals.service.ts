import {TrendEnum} from "../../../shared/types/trend.enum";
import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {StrategyLineStrikeModuleEnum} from "../strategy-line-strike-module.enum";
import {IndicatorsService} from "./indicators.service";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {OrderTakeStopInterface} from "../../../shared/types/position.interface";
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";

@injectable()
export class SignalsService {
    constructor(
        @inject(StrategyLineStrikeModuleEnum.LineStrikeIndicators) private _indicators: IndicatorsService,
        @inject(SharedModuleEnum.config) private _config: ConfigService,

    ) {
    }

    trend() {
        const {hist} = this._indicators.historyMACD!;
        const idx = this._indicators.index;
        let trend = TrendEnum.UNSPECIFIED;
        console.log(new Date(this._indicators.currentBar[BarRespEnum.openTime]))
        const current = this._indicators.currentBar
        debugger
        if (this._config.config.lineStrike.interval === this._config.config.lineStrike.MACD.interval) {
            if (hist[idx - 3] > 0 && hist[idx - 1] > 0 && hist[idx - 2] > 0 && hist[idx] > 0) trend = TrendEnum.BULL
            if (hist[idx - 3] < 0 && hist[idx - 1] < 0 && hist[idx - 2] < 0 && hist[idx] < 0) trend = TrendEnum.BEAR
        } else {
            if (hist[idx] > 0) trend = TrendEnum.BULL
            if (hist[idx] < 0) trend = TrendEnum.BEAR
        }


        return hist[idx] > 0 ? TrendEnum.BULL : TrendEnum.BEAR
    }

    signalOpenLongPosition() {

        const history = this._indicators.historyData;
        const candle1 = history[this._indicators.index - 3];
        const candle2 = history[this._indicators.index - 2];
        const candle3 = history[this._indicators.index - 1];
        const candle4 = history[this._indicators.index];
        // const getHeightBar = (bar: Array<string | number>) => +bar[BarRespEnum.highPrice] - +bar[BarRespEnum.lowPrice];
        const getHeightBody = (bar: Array<string | number>) => +bar[BarRespEnum.closePrice] - +bar[BarRespEnum.openPrice];

        const isBearTrend =
            getHeightBody(candle1) < 0 &&
            getHeightBody(candle2) < 0 &&
            getHeightBody(candle3) < 0;
        const eachCandleNewMin =
            +candle1[BarRespEnum.lowPrice] >= +candle2[BarRespEnum.lowPrice] &&
            +candle2[BarRespEnum.lowPrice] >= +candle3[BarRespEnum.lowPrice]
        const isFullAbsorption =
            Math.max(+candle1[BarRespEnum.openPrice], +candle2[BarRespEnum.openPrice], +candle3[BarRespEnum.openPrice]) < +candle4[BarRespEnum.closePrice]

        return isBearTrend &&  isFullAbsorption
    }

    signalOpenShortPosition(): boolean {

        const history = this._indicators.historyData;
        const candle1 = history[this._indicators.index - 3];
        const candle2 = history[this._indicators.index - 2];
        const candle3 = history[this._indicators.index - 1];
        const candle4 = history[this._indicators.index];

        // const getHeightBar = (bar: Array<string | number>) => +bar[BarRespEnum.highPrice] - +bar[BarRespEnum.lowPrice];
        const getHeightBody = (bar: Array<string | number>) => +bar[BarRespEnum.closePrice] - +bar[BarRespEnum.openPrice];

        const isBullTrend =
            getHeightBody(candle1) > 0 &&
            getHeightBody(candle2) > 0 &&
            getHeightBody(candle3) > 0;
        const eachCandleNewMin =
            +candle1[BarRespEnum.highPrice] <= +candle2[BarRespEnum.highPrice] &&
            +candle2[BarRespEnum.highPrice] <= +candle3[BarRespEnum.highPrice]
        const isFullAbsorption =
            Math.min(+candle1[BarRespEnum.openPrice], +candle2[BarRespEnum.openPrice], +candle3[BarRespEnum.openPrice]) > +candle4[BarRespEnum.closePrice]

        return isBullTrend &&  isFullAbsorption
    }

    signalCloseLongPosition(order: OrderTakeStopInterface) {
        return +this._indicators.currentBar[BarRespEnum.closePrice] > +order.takePrice;
    }

    signalCloseShortPosition(order: OrderTakeStopInterface) {
        return +this._indicators.currentBar[BarRespEnum.closePrice] < +order.takePrice;
    }

    stopLimitLongPosition(order: OrderTakeStopInterface) {
        return +this._indicators.currentBar[BarRespEnum.closePrice] < +order.stopPrice;
    }

    stopLimitShortPosition(order: OrderTakeStopInterface) {
        return +this._indicators.currentBar[BarRespEnum.closePrice] > +order.stopPrice;
    }
}


