import {CandleSideEnum} from "../../../shared/types/candleSide.enum";

export interface BuySellVolumeInterface {
    barSide: CandleSideEnum
    volumeSideBuy: number
    volumeSideSell: number
    volumeSide: CandleSideEnum
}
