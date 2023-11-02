import {TrendEnum} from "../../../shared/types/trend.enum";
import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {StrategyPinBarModuleEnum} from "../strategy-pinBar-module.enum";
import {IndicatorsService} from "./indicators.service";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {OrderTakeStopInterface} from "../../../shared/types/position.interface";

@injectable()
export class SignalsService {
    constructor(
        @inject(StrategyPinBarModuleEnum.PinBarIndicators) private _indicators: IndicatorsService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService
    ) {
    }

    trend(): TrendEnum {
        const {hist, signal, line} = this._indicators.historyMACD!;
        const idx = this._indicators.index;
        let trend = TrendEnum.UNSPECIFIED;

        if (hist[idx] > 0 && hist[idx - 1] && hist[idx - 2]) trend = TrendEnum.BULL
        if (hist[idx] < 0 && hist[idx - 1] && hist[idx - 2]) trend = TrendEnum.BEAR
        return trend
    }

    signalOpenLongPosition() {
        if (this.trend() !== TrendEnum.BEAR) return;

        const history = this._indicators.historyData;
        const rightBar = history[this._indicators.index];
        const MediumBar = history[this._indicators.index - 1];
        const leftBar = history[this._indicators.index - 2];
        const getHeightBar = (bar: Array<string | number>) => +bar[BarRespEnum.highPrice] - +bar[BarRespEnum.lowPrice];
        const getHeightBody = (bar: Array<string | number>) => +bar[BarRespEnum.closePrice] - +bar[BarRespEnum.openPrice];

        const checkLeftBar = (): boolean => {
            const isBearCandle = getHeightBody(leftBar) < 0;
            const isBodyMore06Bar = (getHeightBar(leftBar) * 0.5 < Math.abs(getHeightBody(leftBar)))
            return isBearCandle && isBodyMore06Bar
        }
        const checkMediumBar = (): boolean => {
            const body = getHeightBody(MediumBar);
            const MainShadow = body > 0 ?
                +MediumBar[BarRespEnum.openPrice] - +MediumBar[BarRespEnum.lowPrice] :
                +MediumBar[BarRespEnum.closePrice] - +MediumBar[BarRespEnum.lowPrice]
            const secondaryShadow = body > 0 ?
                +MediumBar[BarRespEnum.highPrice] - +MediumBar[BarRespEnum.closePrice] :
                +MediumBar[BarRespEnum.highPrice] - +MediumBar[BarRespEnum.openPrice]


            const checkHeightShadow = MainShadow > Math.abs(body) * 2;
            const checkSecondaryShadow = secondaryShadow < Math.abs(body);
            const lowPriceLowerThanLowLeftCandle = MediumBar[BarRespEnum.lowPrice] < leftBar[BarRespEnum.lowPrice];
            const candleCloseInRangeLeftCandle = leftBar[BarRespEnum.lowPrice] < MediumBar[BarRespEnum.closePrice]
            const leftBodyMore2ThenMediumBody = Math.abs(getHeightBody(leftBar)) > (Math.abs(body) * 2)

            return checkHeightShadow && checkSecondaryShadow && lowPriceLowerThanLowLeftCandle &&
                candleCloseInRangeLeftCandle && leftBodyMore2ThenMediumBody
        }
        const checkRightBar = () => {
            const lowMoreThenLowMediumCandle = rightBar[BarRespEnum.lowPrice] > MediumBar[BarRespEnum.lowPrice];
            const closeMoreHighMediumCandle = rightBar[BarRespEnum.closePrice] > MediumBar[BarRespEnum.highPrice];
            const isBullCandle = rightBar[BarRespEnum.openPrice] < rightBar[BarRespEnum.closePrice];
            return lowMoreThenLowMediumCandle && closeMoreHighMediumCandle && isBullCandle
        }

        return checkLeftBar() && checkRightBar() && checkMediumBar()
    }

    signalOpenShortPosition(): boolean {
        if (this.trend() !== TrendEnum.BULL) return false;

        const history = this._indicators.historyData;
        const rightBar = history[this._indicators.index];
        const MediumBar = history[this._indicators.index - 1];
        const leftBar = history[this._indicators.index - 2];

        const getHeightBar = (bar: Array<string | number>) => +bar[BarRespEnum.highPrice] - +bar[BarRespEnum.lowPrice];
        const getHeightBody = (bar: Array<string | number>) => +bar[BarRespEnum.closePrice] - +bar[BarRespEnum.openPrice];

        const checkLeftBar = (): boolean => {
            const isBullCandle = getHeightBody(leftBar) > 0;
            const isBodyMore06Bar = (getHeightBar(leftBar) * 0.5 < getHeightBody(leftBar))
            return isBullCandle && isBodyMore06Bar
        }
        const checkMediumBar = (): boolean => {
            const body = getHeightBody(MediumBar);
            const MainShadow = body > 0 ?
                +MediumBar[BarRespEnum.highPrice] - +MediumBar[BarRespEnum.closePrice] :
                +MediumBar[BarRespEnum.highPrice] - +MediumBar[BarRespEnum.openPrice]
            const secondaryShadow = body > 0 ?
                +MediumBar[BarRespEnum.openPrice] - +MediumBar[BarRespEnum.lowPrice] :
                +MediumBar[BarRespEnum.closePrice] - +MediumBar[BarRespEnum.lowPrice]


            const checkHeightShadow = MainShadow > Math.abs(body) * 2;
            const checkSecondaryShadow = secondaryShadow < Math.abs(body);
            const highPriceMoreThanHighLeftCandle = MediumBar[BarRespEnum.highPrice] > leftBar[BarRespEnum.highPrice];
            const candleCloseInRangeLeftCandle = leftBar[BarRespEnum.highPrice] > MediumBar[BarRespEnum.closePrice]
            const leftBodyMore2ThenMediumBody = getHeightBody(leftBar) > (Math.abs(body) * 2)

            return checkHeightShadow && checkSecondaryShadow && highPriceMoreThanHighLeftCandle &&
                candleCloseInRangeLeftCandle && leftBodyMore2ThenMediumBody
        }
        const checkRightBar = () => {
           const highLowerThenHighMediumCandle = MediumBar[BarRespEnum.highPrice] > rightBar[BarRespEnum.highPrice];
            const closeLowerLowMediumCandle = MediumBar[BarRespEnum.lowPrice] > rightBar[BarRespEnum.closePrice];
            const isBearCandle = rightBar[BarRespEnum.openPrice] > rightBar[BarRespEnum.closePrice];
            return highLowerThenHighMediumCandle && closeLowerLowMediumCandle && isBearCandle
        }

        return checkLeftBar() && checkRightBar() && checkMediumBar()
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


