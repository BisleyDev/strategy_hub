import {ContainerModule, interfaces} from "inversify";
import {ApiModuleEnum} from "./api-module.enum";
import {BinanceClientService} from "./binance/binance-client.service";
import {ExchangeInfoService} from "./binance/exchange-info.service";
import {HistoryBarsService} from "./binance/history-bars.service";
import {BinanceMarginClientService} from "./binance/binance-margin-client.service";

export const ApiModule = new ContainerModule((bind: interfaces.Bind) => {
    bind(ApiModuleEnum.binanceClient).to(BinanceClientService).inSingletonScope();
    bind(ApiModuleEnum.binanceMarginClient).to(BinanceMarginClientService).inSingletonScope();
    bind(ApiModuleEnum.exchangeInfo).to(ExchangeInfoService).inSingletonScope();
    bind(ApiModuleEnum.historyBars).to(HistoryBarsService);
});
