import {ContainerModule} from "inversify";
import {SharedModuleEnum} from "./shared-module.enum";
import {LoggerService} from "./logger/logger.service";
import {ConfigService} from "./config/config.service";
import {ParserService} from "./services/parser.service";
import {TelegramBotService} from "./telegram-bot/telegram-bot.service";
import {PositionsRepositoryService} from "./services/positions.repository.service";
import {OrderTakeStopRepositoryService} from "./services/OrderTakeStop.repository.service";

export const SharedModule = new ContainerModule(bind => {
    bind(SharedModuleEnum.logger).to(LoggerService).inSingletonScope();
    bind(SharedModuleEnum.config).to(ConfigService).inSingletonScope();
    bind(SharedModuleEnum.parser).to(ParserService).inSingletonScope();
    bind(SharedModuleEnum.telegramBot).to(TelegramBotService).inSingletonScope();
    bind(SharedModuleEnum.positionRepository).to(PositionsRepositoryService).inSingletonScope();
    bind(SharedModuleEnum.orderTakeStopRepository).to(OrderTakeStopRepositoryService).inSingletonScope();
})
