import {injectable} from "inversify";
import 'reflect-metadata';
import {IntervalEnum} from "../types/interval.enum";

@injectable()
export class ParserService {

    constructor() {
    }

    public parseIntervalToMilliseconds(interval: IntervalEnum): number {
        const frame = interval[interval.length - 1];
        const frameMilliseconds = this._milliseconds(frame);
        const time = +interval.replace(frame, '');
        return time * frameMilliseconds;
    }

    private _milliseconds(frame: string): number {
        switch (frame) {
            case 's':
                return 1000;
            case 'm':
                return 1000 * 60;
            case 'h':
                return 1000 * 60 * 60;
            case 'd':
                return 1000 * 60 * 60 * 24;
            case 'w':
                return 1000 * 60 * 60 * 24 * 7;
            case 'M':
                return 1000 * 60 * 60 * 24 * 30;
        }
        return 1000;
    }


}
