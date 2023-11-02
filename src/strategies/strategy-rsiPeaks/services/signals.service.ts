import {TrendEnum} from "../../../shared/types/trend.enum";
import {id, inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {StrategyRsiPeaksModuleEnum} from "../strategy-rsiPeaks-module.enum";
import {IndicatorsService} from "./indicators.service";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {OrderTakeStopInterface} from "../../../shared/types/position.interface";

@injectable()
export class SignalsService {
    constructor(
        @inject(StrategyRsiPeaksModuleEnum.RsiPeaksIndicators) private _indicators: IndicatorsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService
    ) {
    }

    trend(): TrendEnum {
        const rsi = this._indicators.historyRSI;
        const sma = this._indicators.historyRSI;
        const idx = this._indicators.index;
        let trend = TrendEnum.UNSPECIFIED;

        // if () trend = TrendEnum.BULL
        // if () trend = TrendEnum.BEAR
        return trend
    }

    signalOpenLongPosition(): boolean {
        const rsi = this._indicators.historyRSI;
        const sma = this._indicators.historySMA;
        const idx = this._indicators.index;
        const high = this._configService.config.RsiPeaks.RSI.upperBand;

        return rsi[idx] > high && rsi[idx] > sma[idx] && rsi[idx - 1] < high
    }

    signalOpenShortPosition(): boolean {
        const rsi = this._indicators.historyRSI;
        const sma = this._indicators.historySMA;
        const idx = this._indicators.index;
        const low = this._configService.config.RsiPeaks.RSI.lowerBand;

        return rsi[idx] < low && rsi[idx] < sma[idx] && rsi[idx - 1] > low
    }

    signalCloseLongPosition(): boolean {
        const rsi = this._indicators.historyRSI;
        const sma = this._indicators.historySMA;
        const idx = this._indicators.index;
        const high = this._configService.config.RsiPeaks.RSI.upperBand;

        return rsi[idx] < sma[idx] ||
            (rsi[idx] < high && rsi[idx - 1] > high && rsi[idx - 2] > high)
    }

    signalCloseShortPosition(): boolean {
        const rsi = this._indicators.historyRSI;
        const sma = this._indicators.historySMA;
        const idx = this._indicators.index;
        const low = this._configService.config.RsiPeaks.RSI.lowerBand;

        return rsi[idx] > sma[idx] ||
            (rsi[idx] > low && rsi[idx - 1] < low && rsi[idx - 2] < low)
    }

    // stopLimitLongPosition(order: OrderTakeStopInterface) {
    //     return +this._indicators.currentBar[BarRespEnum.lowPrice] < +order.stopPrice;
    // }
    //
    // stopLimitShortPosition(order: OrderTakeStopInterface) {
    //     return +this._indicators.currentBar[BarRespEnum.highPrice] > +order.stopPrice;
    // }
}


