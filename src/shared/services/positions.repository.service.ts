import {OrderTakeStopInterface, PositionInterface} from "../types/position.interface";
import {inject, injectable} from "inversify";
import {DatabaseEnum} from "../../database/database.enum";
import {PrismaService} from "../../database/prisma.service";
import {PositionModel} from "@prisma/client";
import {StatusPositionsEnum} from "../types/status-positions.enum";
import {StrategyEnum} from "../types/strategy.enum";

@injectable()
export class PositionsRepositoryService {
    constructor(
        @inject(DatabaseEnum.prismaService) private _prismaService: PrismaService,

    ) {
    }

    async openPosition(position: PositionInterface): Promise<PositionInterface> {
        return this._prismaService.client.positionModel.create({
            data: {...position}
        }) as Promise<PositionInterface>
    }

    async findOpenPosition(symbol?: string, strategy?: StrategyEnum): Promise<PositionInterface | null> {
        return this._prismaService.client.positionModel.findFirst({
            where: {
                status: StatusPositionsEnum.OPEN,
                symbol,
                strategy,
            }
        }) as Promise<PositionInterface | null>
    }

     async getAllOpenPositions(): Promise<PositionInterface[]> {
        return this._prismaService.client.positionModel.findMany({
            where: {
                status: StatusPositionsEnum.OPEN,
            }
        }) as Promise<PositionInterface[]>
    }

    async closePosition(position: PositionInterface): Promise<PositionModel> {
        const {timeClose, feeClose, priceClose, status, profit, profitPercent} = position
        return this._prismaService.client.positionModel.update({
            where: {id: position.id},
            data: {timeClose, feeClose, priceClose, status, profit, profitPercent}
        })
    }

    async getAllPositions(): Promise<PositionInterface[]> {
        return this._prismaService.client.positionModel.findMany() as Promise<PositionInterface[]>
    }

    async getClosePositions(strategy: StrategyEnum): Promise<PositionInterface[]> {
        const allOrders = this._prismaService.client.orderTakeStopModel.findMany({
            where: {
                strategy,
            }
        }) as Promise<PositionInterface[]>
        return allOrders.then(orders => orders.filter(el => el.status !== StatusPositionsEnum.OPEN))
    }

    clearData(strategy: StrategyEnum) {
        this._prismaService.client.positionModel.deleteMany({
            where: {strategy}
        })
    }
}
