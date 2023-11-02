import {OrderTakeStopInterface} from "../types/position.interface";
import {inject, injectable} from "inversify";
import {DatabaseEnum} from "../../database/database.enum";
import {PrismaService} from "../../database/prisma.service";
import {OrderTakeStopModel} from "@prisma/client";
import {StatusPositionsEnum} from "../types/status-positions.enum";
import {StrategyEnum} from "../types/strategy.enum";

@injectable()
export class OrderTakeStopRepositoryService {
    constructor(
        @inject(DatabaseEnum.prismaService) private _prismaService: PrismaService,

    ) {
    }

    async openOrder(order: OrderTakeStopInterface): Promise<OrderTakeStopInterface> {
        return this._prismaService.client.orderTakeStopModel.create({
            data: {...order}
        }) as Promise<OrderTakeStopInterface>
    }

    async findOpenOrder(symbol?: string, strategy?: StrategyEnum): Promise<OrderTakeStopInterface | null> {
        return this._prismaService.client.orderTakeStopModel.findFirst({
            where: {
                status: StatusPositionsEnum.OPEN,
                symbol,
                strategy,
            }
        }) as Promise<OrderTakeStopInterface | null>
    }

    async getCloseOrders(strategy: StrategyEnum): Promise<OrderTakeStopInterface[]> {
        const allOrders = this._prismaService.client.orderTakeStopModel.findMany({
            where: {
                strategy,
            }
        }) as Promise<OrderTakeStopInterface[]>
        return allOrders.then(orders => orders.filter(el => el.status !== StatusPositionsEnum.OPEN))
    }

     async getAllOpenPositions(): Promise<OrderTakeStopInterface[]> {
        return this._prismaService.client.orderTakeStopModel.findMany({
            where: {
                status: StatusPositionsEnum.OPEN,
            }
        }) as Promise<OrderTakeStopInterface[]>
    }

    async closePosition(position: OrderTakeStopInterface): Promise<OrderTakeStopModel> {
        const {timeClose, feeClose, priceClose, status, profit, profitPercent} = position
        return this._prismaService.client.orderTakeStopModel.update({
            where: {id: position.id},
            data: {timeClose, feeClose, priceClose, status, profit, profitPercent}
        })
    }

    async getAllPositions(): Promise<OrderTakeStopInterface[]> {
        return this._prismaService.client.orderTakeStopModel.findMany() as Promise<OrderTakeStopInterface[]>
    }
    clearData(strategy: StrategyEnum) {
        this._prismaService.client.orderTakeStopModel.deleteMany({
            where: {strategy}
        })
    }
}
