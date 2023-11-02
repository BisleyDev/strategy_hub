import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../../shared/shared-module.enum";
import {LoggerService} from "../../shared/logger/logger.service";
import {ApiModuleEnum} from "../api-module.enum";
import {ExchangeInfoService} from "./exchange-info.service";
import {SymbolInfoInterface} from "./types/symbol-info.interface";
import {OrderMarketParamsInterface} from "./types/orderMarketParams.interface";
import {OrderMarketRespInterface} from "./types/orderMarketResp.interface";
import {TypeOrderEnum} from "../../shared/types/type-order.enum";
import {ConfigService} from "../../shared/config/config.service";

const {Spot} = require('@binance/connector')

@injectable()
export class BinanceClientService {
    private client;
    private _symbolData: SymbolInfoInterface;

    constructor(
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,
        @inject(ApiModuleEnum.exchangeInfo) private _exchangeInfo: ExchangeInfoService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
    ) {
        const apiKey = this._configService.getEnv('BinanceApiKey');
        const apiSecretKey = this._configService.getEnv('BinanceSecretKey')
        this.client = new Spot(apiKey, apiSecretKey)
    }

    public async getFreeAmountByAsset(asset: string): Promise<number> {
        try {
            const account = await this.client.account();
            const value = account.data.balances.find((el: any) => el.asset === asset.toUpperCase()).free;
            return +value;
        } catch (e) {
            this._logger.error('[BinanceClientService => getFreeAmountByAsset]: ' + e)
            return 0;
        }
    }

    public async getFreeAmountInSpotWallet(asset: string): Promise<any> {
        const wallet = await this.client.account()
        console.log(wallet.data.balances.filter((el: any) => el.free > 0))
        return wallet.data.balances.filter((el: any) => el.free > 0);

    }

    public async newOrderMarket({quoteOrderQty, quantity, symbol, side}: OrderMarketParamsInterface): Promise<OrderMarketRespInterface | null> {
        try {
            this._symbolData = await this._exchangeInfo.getSymbolsInfo(symbol);
            const order = await this.client.newOrder(symbol, side, TypeOrderEnum.MARKET, {quantity, quoteOrderQty})
            const {data} = await this.client.myTrades(symbol, {orderId: order.orderId})
            this._logger.result("myTrades: " + data)
            const orders = data.filter((el: any) => el.orderId === order.orderId);
            this._logger.result("Current orders: " + orders)
            const position = {
                ...orders[0],
                qty: orders.reduce((prev: number, current: any) => (prev + +current.qty), 0),
                quoteQty: orders.reduce((prev: number, current: any) => (prev + +current.quoteQty), 0),
            }
            this._logger.result("Custom position: " + position)
            return new Promise(resolve => ({
                symbol: position.symbol,
                orderId: position.orderId + '',
                price: +position.price,
                qty: position.qty,
                quoteQty: position.quoteQty,
                commission: +position.commission,
                time: position.time,
                commissionAsset: position.commissionAsset
            } as OrderMarketRespInterface))
        } catch (e: any) {
            this._logger.error('[BinanceClientService => newOrderMarket]: ' + e)
            return new Promise(resolve => null)
        }
    }
}
