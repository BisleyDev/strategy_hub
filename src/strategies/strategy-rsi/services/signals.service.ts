import {IndicatorsService} from "./indicators.service";
import {TrendEnum} from "../../../shared/types/trend.enum";
import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {StrategyRsiModuleEnum} from "../strategy-rsi-module.enum";
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";

@injectable()
export class SignalsService {
    constructor(
        @inject(StrategyRsiModuleEnum.rsiIndicators) private _indicators: IndicatorsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService
    ) {
    }

    trend(): TrendEnum {
        const {line, hist} = this._indicators.historyMACD!;
        let trend = TrendEnum.UNSPECIFIED;
        if (line[line.length - 1] > 0 && hist[hist.length - 1] > 0) trend = TrendEnum.BULL;
        if (line[line.length - 1] < 0 && hist[hist.length - 1] < 0) trend = TrendEnum.BEAR;
        return trend;
    }

    signalOpenLongPosition() {
        if(this.trend() !== TrendEnum.BULL) return;
        const rsi = this._indicators.historyRSI.reverse();
        const sma = this._indicators.historySMA.reverse();
        const {upperBand, lowerBand} = this._configService.config.Indicators_Params.RSI;
        return rsi[1] < lowerBand && sma[1] < lowerBand && rsi[1] < sma[1] && rsi[0] > sma[0]
    }

    signalOpenShortPosition() {
        if(this.trend() !== TrendEnum.BEAR) return;
        const rsi = this._indicators.historyRSI.reverse();
        const sma = this._indicators.historySMA.reverse();
        const {upperBand, lowerBand} = this._configService.config.Indicators_Params.RSI;
        return rsi[1] > upperBand && sma[1] > upperBand && rsi[1] > sma[1] && rsi[0] < sma[0]
    }

    signalCloseLongPosition() {
        const rsi = this._indicators.historyRSI.reverse();
        const {upperBand, lowerBand} = this._configService.config.Indicators_Params.RSI;
        return rsi[1] > upperBand && rsi[0] < upperBand;
    }

    signalCloseShortPosition() {
        const rsi = this._indicators.historyRSI.reverse();
        const {upperBand, lowerBand} = this._configService.config.Indicators_Params.RSI;
        return rsi[1] < lowerBand && rsi[0] > lowerBand;
    }

    signalStopLongPosition() {
        const hist = this._indicators.historyMACD!.hist.reverse();
        return this.trend() === TrendEnum.BEAR ||
            (hist[1] > 0 && hist[0] < 0) ||
            (hist[1] < 0 && hist[0] > 0)
    }

    signalStopShortPosition() {
        const hist = this._indicators.historyMACD!.hist.reverse();
        return this.trend() === TrendEnum.BULL ||
            (hist[1] > 0 && hist[0] < 0) ||
            (hist[1] < 0 && hist[0] > 0)
    }

    stopLimitLongPosition(openPrice: number): boolean {
        const currentPrice = +this._indicators.currentBar[BarRespEnum.lowPrice];
        return ((currentPrice - openPrice) / openPrice) < -(this._configService.config.Indicators_Params.stopLimit)
    }

    stopLimitShortPosition(openPrice: number): boolean {
        const currentPrice = +this._indicators.currentBar[BarRespEnum.highPrice];
        return ((currentPrice - openPrice) / openPrice) > (this._configService.config.Indicators_Params.stopLimit)
    }
}


