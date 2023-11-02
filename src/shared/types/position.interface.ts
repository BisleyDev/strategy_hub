import {SideOrderEnum} from "./side-order.enum";
import {StatusPositionsEnum} from "./status-positions.enum";
import {AccountsEnum} from "./accounts.enum";
import {StrategyEnum} from "./strategy.enum";

export interface PositionInterface {
    id: string;
    timeClose: Date | null;
    timeOpen: Date ;
    symbol: string;
    side: SideOrderEnum;
    status: StatusPositionsEnum;
    sizeQuote: number;
    sizeBase: number;
    priceOpen: number;
    priceClose: number | null;
    fee: number;
    feeAsset: string;
    profit: number | null;
    feeClose: number | null;
    profitPercent: number | null;
    account: AccountsEnum;
    strategy: StrategyEnum
}

export interface OrderTakeStopInterface extends PositionInterface{
    stopPrice: number;
    takePrice: number;
}
