import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../shared/shared-module.enum";
import {LoggerService} from "../../shared/logger/logger.service";
import {ApiModuleEnum} from "../api-module.enum";
import {ExchangeInfoService} from "./exchange-info.service";
import {SymbolInfoInterface} from "./types/symbol-info.interface";
import {TypeOrderEnum} from "../../shared/types/type-order.enum";
import {ConfigService} from "../../shared/config/config.service";
import {MarginSideEffectEnum} from "./types/MarginSideEffect.enum";
import {SideOrderEnum} from "../../shared/types/side-order.enum";

const {Spot} = require('@binance/connector')
const Margin = require('@binance/connector/src/modules/margin');

export interface newOrderIsolateReqI {
    symbol: string, side: SideOrderEnum, isOpenPosition: boolean, quantity: number
}

export interface newOrderIsolateResp {
    price: number
    sizeQuote: number, //BTC
    sizeBase: number, //USDT
    fee: number,
    feeAsset: string, //BNB
    orderId: string,
    time: Date

}

@injectable()
export class BinanceMarginClientService {
    private client;
    private _symbolData: SymbolInfoInterface;

    constructor(
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
        @inject(ApiModuleEnum.exchangeInfo) private _exchangeInfo: ExchangeInfoService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
    ) {
        const apiKey = this._configService.getEnv('BinanceApiKey');
        const apiSecretKey = this._configService.getEnv('BinanceSecretKey')
        this.client = new Spot(apiKey, apiSecretKey);
    }

    public async getFreeQuoteAsset(symbol: string): Promise<number> {
        try {
            const account = await this.client.isolatedMarginAccountInfo();
            const info = account.data.assets.find((el: any) => el.symbol === symbol);
            return (+info.baseAsset.free * 0.5) * +info.marginRatio;
        } catch (e: any) {
            this._logger.error('[BinanceMarginClientService => getFreeAmountByAsset]: ', e.response.data)
            return 0;
        }
    }

    public async newOrderIsolate({symbol, side, quantity, isOpenPosition}: newOrderIsolateReqI): Promise<newOrderIsolateResp | null> {
      try {
          quantity = +quantity.toFixed(4)
          const options = {
              isIsolated: true,
              sideEffectType: isOpenPosition ? MarginSideEffectEnum.AUTO_REPAY : MarginSideEffectEnum.MARGIN_BUY,
              newOrderRespType: 'FULL',
              quoteOrderQty: quantity
          }
          // @ts-ignore
          // isOpenPosition ? options.quoteOrderQty = quantity : options.quantity = quantity;
          const data = await this.client.newMarginOrder(symbol, side,  TypeOrderEnum.MARKET, options);
          const fills = data.data.fills
          const maxPrice = fills?.sort((a: any, b: any) => +b.price - +a.price)[0].price
          return {
              price: +maxPrice,
              sizeQuote: +data.data.executedQty, //BTC
              sizeBase: +data.data.cummulativeQuoteQty, //USDT
              fee: fills.reduce((acc: number, curr: any) => (acc + +curr.commission), 0),
              feeAsset: fills[0].commissionAsset, //BNB
              orderId: data.data.orderId + '',
              time: new Date(data.data.transactTime)
          }
      } catch (e: any) {
          this._logger.error('[BinanceMarginClientService => getFreeAmountByAsset]: ', e.response.data)
          return null
      }
    }

    //
    // public async getFreeAmountInSpotWallet(asset: string): Promise<any> {
    //     const wallet = await this.client.account()
    //     console.log(wallet.data.balances.filter((el: any) => el.free > 0))
    //     return wallet.data.balances.filter((el: any) => el.free > 0);
    //
    // }
    //
    // public async newOrderMargin({quoteOrderQty, quantity, symbol, side}: OrderMarketParamsInterface): Promise<OrderMarketRespInterface | null> {
    //     try {
    //         this._symbolData = await this._exchangeInfo.getSymbolsInfo(symbol);
    //         const order = await this.client.newOrder(symbol, side, TypeOrderEnum.MARKET, {quantity, quoteOrderQty})
    //         const {data} = await this.client.myTrades(symbol, {orderId: order.orderId})
    //         this._logger.result(data)
    //         return new Promise(resolve => ({
    //             symbol: data.symbol,
    //             orderId: data.orderId.toString(),
    //             price: +data.price,
    //             qty: +data.qty,
    //             quoteQty: +data.quoteQty,
    //             commission: +data.commission,
    //             time: data.time,
    //             commissionAsset: data.commissionAsset
    //         } as OrderMarketRespInterface))
    //     } catch (e: any) {
    //         this._logger.error('[BinanceClientService => newOrderMarket]: ' + e)
    //         return new Promise(resolve => null)
    //     }
    // }
}
