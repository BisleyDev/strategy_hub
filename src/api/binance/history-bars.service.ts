import {HistoryBarsParamsInterface} from "../../shared/types/history-bars-params.interface";
import axios from "axios";
import {BarRespEnum} from "../../shared/types/bar-resp.enum";
import {BarsResponseType} from "../../shared/types/bars-response.type";
import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../shared/shared-module.enum";
import {ConfigService} from "../../shared/config/config.service";
import {LoggerService} from "../../shared/logger/logger.service";


@injectable()
export class HistoryBarsService {
    private url: string;
    private urlAlternative: string;

    constructor(
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
    ) {
    this.url = this._configService.config.API_URLS.BinanceBaseRest + 'v1/klines';
    this.urlAlternative = this._configService.config.API_URLS.BinanceBaseRest + 'v1/klines';
    }

    private async getBars(params: HistoryBarsParamsInterface): Promise<BarsResponseType> {
        try {
            const resp = await axios.get(this.url, {params})
            return resp.data
        } catch (e: any) {
            this._logger.error("[HistoryBarsService -> getBars] " + e)
            return axios.get(this.urlAlternative, {params}).then(value => value.data).catch(reason => [])
        }
    }

    getHistoryBars(params: HistoryBarsParamsInterface): Promise<Array<Array<number | string>>> {
        let residualLimits = params.limit || 500;
        let bars: BarsResponseType = [];
        const recursive = async (): Promise<BarsResponseType> => {
            const paramsRec: HistoryBarsParamsInterface = {
                ...params,
                limit: residualLimits < this._configService.config.MAX_BARS_LIMIT ? residualLimits : this._configService.config.MAX_BARS_LIMIT,
                endTime: bars.length ? bars[0][BarRespEnum.openTime] : null
            }
            const history = await this.getBars(paramsRec)
            residualLimits -= this._configService.config.MAX_BARS_LIMIT;
            bars = [...history, ...bars];
            return residualLimits > 0 ?
                recursive() :
                new Promise(resolve => resolve(bars))
        }
        return recursive()
    }

    async getHistoryTrades() {
        try {
            const resp = await axios.get('https://api.binance.com/api/v3/aggTrades', {params: {symbol: "BTCUSDT", limit: 10}})
            console.log(resp.data)
            return resp.data
        } catch (e: any) {
            this._logger.error("[HistoryBarsService -> getHistoryTrades] " + e)
        }
    }
}
