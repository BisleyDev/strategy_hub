import {IntervalEnum} from "./interval.enum";

export interface HistoryBarsParamsInterface {
    symbol: string,
    limit?: number,
    interval: IntervalEnum,
    startTime?: number,
    endTime?: number,
}
