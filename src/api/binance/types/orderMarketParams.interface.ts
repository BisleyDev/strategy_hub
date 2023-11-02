import {SideOrderEnum} from "../../../shared/types/side-order.enum";

export interface OrderMarketParamsInterface {
    symbol: string;
    side: SideOrderEnum;
    quantity?: number;
    quoteOrderQty?: number;
}
