import axios from "axios";
import {inject, injectable} from "inversify";
import {SharedModuleEnum} from "../../shared/shared-module.enum";
import {LoggerService} from "../../shared/logger/logger.service";
import 'reflect-metadata';
import {SymbolInfoInterface} from "./types/symbol-info.interface";
import {ConfigService} from "../../shared/config/config.service";

@injectable()
export class ExchangeInfoService {

    constructor(
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService
    ) {
    }

    get URL() {
        return this._configService.config.API_URLS.BinanceBaseRest + 'v3/exchangeInfo'
    }


    getSymbolsInfo(symbol?: string): Promise<SymbolInfoInterface> {
        return axios.get(this.URL, {params: {symbol}})
            .then(value => {
                return symbol ? value.data.symbols[0] : value.data.symbols
            })
            .catch(reason => {
                this._logger.error("[ExchangeInfoService => getSymbolsInfo] " + reason)

            })
    }
}
