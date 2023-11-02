import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../../shared/shared-module.enum";
import {ConfigService} from "../../../shared/config/config.service";
import {StrategyDiffVolumeModuleEnum} from "../strategy-diffVolume.module.enum";
import {IndicatorsService} from "./indicators.service";
import {BarRespEnum} from "../../../shared/types/bar-resp.enum";
import {CandleSideEnum} from "../../../shared/types/candleSide.enum";
import {OrderTakeStopInterface} from "../../../shared/types/position.interface";

@injectable()
export class SignalService {
    constructor(
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
        @inject(StrategyDiffVolumeModuleEnum.DiffVolumeIndicator) private _indicators: IndicatorsService,
    ) {
    }



    private checkTwoCandlesWithSameSide() {
        const history = this._indicators.historyData;
        const currentBar = this._indicators.currentBar;

        const prevBar = history[this._indicators.index - 1];
        const currBSV = this._indicators.BSV[this._indicators.index];
        const prevBSV = this._indicators.BSV[this._indicators.index - 1];

        if (currentBar[BarRespEnum.volume] < this._indicators.averageVolumeByCurrentBar()) return;

        if (currBSV.barSide === currBSV.volumeSide) return;
        if (prevBSV.barSide !== prevBSV.volumeSide) return ;

        if (currBSV.barSide !== prevBSV.barSide) return;

        const calcBody = (candle: any) => Math.abs( candle[BarRespEnum.openPrice] - candle[BarRespEnum.closePrice])

        if (calcBody(currentBar) > calcBody(prevBar)) return;
        if ((currBSV.volumeSide === CandleSideEnum.GREEN ? currBSV.volumeSideBuy : currBSV.volumeSideSell) <
            (prevBSV.volumeSide === CandleSideEnum.GREEN ? prevBSV.volumeSideBuy : prevBSV.volumeSideSell)) return;

        const currVolume = this._indicators.PureVolumes[this._indicators.index];
        const prevVolume = this._indicators.PureVolumes[this._indicators.index - 1];

        // if (currBSV.barSide === currVolume.side) return;
        // console.log(new Date(currentBar[BarRespEnum.openTime]));
        // // console.log(currVolume)
        // if (prevBSV.barSide !== prevVolume.side) return ;
        // if (currBSV.barSide !== prevBSV.barSide) return;
        // if ((currVolume.side === CandleSideEnum.GREEN ? currVolume.buy : currVolume.sell) <
        //         (prevVolume.side === CandleSideEnum.GREEN ? prevVolume.buy : prevVolume.sell)) return;
        return true;
    }

    private checkTwoCandlesWithDiffSide() {
        const history = this._indicators.historyData;
        const currentBar = this._indicators.currentBar;
        const prevBar = history[this._indicators.index - 1];
        const currBSV = this._indicators.BSV[this._indicators.index];
        const prevBSV = this._indicators.BSV[this._indicators.index - 1];

        if (currentBar[BarRespEnum.volume] < this._indicators.averageVolumeByCurrentBar()) return;
        if (currentBar[BarRespEnum.volume] < prevBar[BarRespEnum.volume]) return;

        if (currBSV.barSide === currBSV.volumeSide) return;

        if (currBSV.barSide === prevBSV.barSide) return;

        return true;


    }

    signalOpenLongPosition() {
        const currBSV = this._indicators.BSV[this._indicators.index];
        const currentBar = this._indicators.currentBar;
        const prevBar = this._indicators.historyData[this._indicators.index - 1];

        if (this.checkTwoCandlesWithSameSide() &&
            currBSV.barSide === CandleSideEnum.RED &&
            currentBar[BarRespEnum.highPrice] > prevBar[BarRespEnum.lowPrice]
        ) {
            return {
                stopPrice: +currentBar[BarRespEnum.lowPrice],
                takePrice: +currentBar[BarRespEnum.closePrice] + (+currentBar[BarRespEnum.highPrice] - +currentBar[BarRespEnum.lowPrice]),
                // stopPrice: +currentBar[BarRespEnum.closePrice] - (+currentBar[BarRespEnum.highPrice] - +currentBar[BarRespEnum.lowPrice])
            }
        };
        // if (this.checkTwoCandlesWithDiffSide() &&
        //     currBSV.currBarSide === CandleSideEnum.GREEN &&
        //     prevBar[BarRespEnum.highPrice] < currentBar[BarRespEnum.highPrice]
        // ) {
        //     return {
        //         stopPrice: +currentBar[BarRespEnum.lowPrice],
        //         takePrice: +currentBar[BarRespEnum.highPrice]
        //     }
        // };

        return false;

    }

    signalOpenShortPosition() {
        const currBSV = this._indicators.BSV[this._indicators.index];
        const currentBar = this._indicators.currentBar;
        const prevBar = this._indicators.historyData[this._indicators.index - 1];

        if (this.checkTwoCandlesWithSameSide() &&
            currBSV.barSide === CandleSideEnum.GREEN &&
            currentBar[BarRespEnum.closePrice] < prevBar[BarRespEnum.highPrice]
        ) {
            return {
                stopPrice: +currentBar[BarRespEnum.highPrice],
                takePrice: +currentBar[BarRespEnum.closePrice] - (+currentBar[BarRespEnum.highPrice] - +currentBar[BarRespEnum.lowPrice]),
                // stopPrice: +currentBar[BarRespEnum.closePrice] + (+currentBar[BarRespEnum.highPrice] - +currentBar[BarRespEnum.lowPrice])
            }
        };
        // if (this.checkTwoCandlesWithDiffSide() &&
        //     currBSV.currBarSide === CandleSideEnum.RED &&
        //     prevBar[BarRespEnum.lowPrice] > currentBar[BarRespEnum.lowPrice]
        // ) {
        //     return {
        //         stopPrice: +currentBar[BarRespEnum.highPrice],
        //         takePrice:  +currentBar[BarRespEnum.lowPrice]
        //     }
        // };

        return false;

    }

    signalCloseLongPosition(openPosition: OrderTakeStopInterface) {
        const currBar = this._indicators.currentBar;
        return openPosition.takePrice < currBar[BarRespEnum.highPrice];
    }

    stopLimitLongPosition(openPosition: OrderTakeStopInterface) {
        const currBar = this._indicators.currentBar;
        return openPosition.stopPrice > currBar[BarRespEnum.lowPrice];
    }

    signalCloseShortPosition(openPosition: OrderTakeStopInterface) {
        const currBar = this._indicators.currentBar;
        return openPosition.takePrice > currBar[BarRespEnum.lowPrice];
    }

    stopLimitShortPosition(openPosition: OrderTakeStopInterface) {
        const currBar = this._indicators.currentBar;
        return openPosition.stopPrice < currBar[BarRespEnum.highPrice];

    }
}
