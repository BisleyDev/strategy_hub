import {TrendEnum} from "../../../shared/types/trend.enum";
import {id, inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {StrategyCciModuleEnum} from "../strategy-cci-module.enum";
import {IndicatorsService} from "./indicators.service";
import {PositionInterface} from "../../../shared/types/position.interface";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";

@injectable()
export class SignalsService {
    constructor(
        @inject(StrategyCciModuleEnum.CCIIndicators) private _indicators: IndicatorsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService
    ) {
    }

    signalOpenLongPosition(): boolean {
        const sma = this._indicators.historySMA;
        const cci = this._indicators.historyCCI;
        const idx = this._indicators.index;

        return (sma[idx - 1] < 0 && sma[idx] < 0) && (sma[idx - 1] > cci[idx - 1] && sma[idx] < cci[idx])
    }

    signalOpenShortPosition(): boolean {
        const sma = this._indicators.historySMA;
        const cci = this._indicators.historyCCI;
        const idx = this._indicators.index;

        return (sma[idx - 1] > 0 && sma[idx] > 0) && (sma[idx - 1] < cci[idx - 1] && sma[idx] > cci[idx])

    }

    signalCloseLongPosition(): boolean {
        const cci = this._indicators.historyCCI;
        const idx = this._indicators.index;
        const high = this._configService.config.CCI.CCI.upperBand;

        return cci[idx] < high && cci[idx - 1] > high
    }

    signalCloseShortPosition(): boolean {
        const cci = this._indicators.historyCCI;
        const idx = this._indicators.index;
        const low = this._configService.config.CCI.CCI.lowerBand;

        return cci[idx] > low && cci[idx - 1] < low
    }

    stopLongPosition(): boolean {
        const sma = this._indicators.historySMA;
        const cci = this._indicators.historyCCI;
        const idx = this._indicators.index;

        return sma[idx] > cci[idx]
    }
    stopShortPosition(): boolean {
        const sma = this._indicators.historySMA;
        const cci = this._indicators.historyCCI;
        const idx = this._indicators.index;

        return sma[idx] < cci[idx]
    }

    stopLimitLongPosition(order: PositionInterface) {
        return +this._indicators.currentBar[BarRespEnum.lowPrice] < +order.priceOpen * (1 - 0.05);
    }

    stopLimitShortPosition(order: PositionInterface) {
        return +this._indicators.currentBar[BarRespEnum.highPrice] > +order.priceOpen * (1 + 0.05);
    }
}


