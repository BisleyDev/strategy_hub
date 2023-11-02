import {inject, injectable} from "inversify";
import {PrismaClient} from "@prisma/client";
import {SharedModuleEnum} from "../shared/shared-module.enum";
import {LoggerService} from "../shared/logger/logger.service";

@injectable()
export class PrismaService {
    client: PrismaClient;

    constructor(
        @inject(SharedModuleEnum.logger) private _logger: LoggerService,

    ) {
        this.client = new PrismaClient()
    }

    async connect(): Promise<void> {
        try {
            this.client.$connect();
            this._logger.log('[PrismaService] database connect success')
        } catch (e) {
            if (e instanceof Error) {
                this._logger.error('[PrismaService] database connect error: ' + e.message)
            }
        }
    }
    async disconnect(): Promise<void> {
        this.client.$disconnect();
    }

}
