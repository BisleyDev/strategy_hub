import {OrderTypeEnum} from "./order-type.enum";
import {SymbolPriceFilterInterface} from "./symbol-price-filter.interface";

export interface SymbolInfoInterface {
    symbol: string;
    status: "TRADING" | string;
    baseAsset: string;
    quoteAsset: string;
    orderTypes: OrderTypeEnum[];
    icebergAllowed: boolean,
    ocoAllowed: boolean,
    quoteOrderQtyMarketAllowed: boolean,
    allowTrailingStop: boolean,
    cancelReplaceAllowed: boolean,
    isSpotTradingAllowed: boolean,
    isMarginTradingAllowed: boolean,
    filters: Array<object | SymbolPriceFilterInterface>,
}
