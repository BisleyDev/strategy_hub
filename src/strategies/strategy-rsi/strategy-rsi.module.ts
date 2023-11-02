import {ContainerModule} from "inversify";
import {StrategyRsiModuleEnum} from "./strategy-rsi-module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalsService} from "./services/signals.service";
import {StrategyRsiService} from "./services/strategy-rsi.service";
import {PositionsRepositoryService} from "../../shared/services/positions.repository.service";

export const StrategyRsiModule = new ContainerModule(bind => {
    bind(StrategyRsiModuleEnum.rsiIndicators).to(IndicatorsService).inSingletonScope();
    bind(StrategyRsiModuleEnum.rsiSignals).to(SignalsService);
    bind(StrategyRsiModuleEnum.rsiStrategy).to(StrategyRsiService).inSingletonScope();
})
