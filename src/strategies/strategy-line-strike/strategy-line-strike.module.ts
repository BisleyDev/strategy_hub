import {ContainerModule} from "inversify";
import {StrategyLineStrikeModuleEnum} from "./strategy-line-strike-module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalsService} from "./services/signals.service";
import {StrategyLineStrikeService} from "./services/strategy-line-strike.service";

export const StrategyLineStrikeModule = new ContainerModule(bind => {
    bind(StrategyLineStrikeModuleEnum.LineStrikeIndicators).to(IndicatorsService).inSingletonScope();
    bind(StrategyLineStrikeModuleEnum.LineStrikeSignals).to(SignalsService).inSingletonScope();
    bind(StrategyLineStrikeModuleEnum.LineStrikeStrategy).to(StrategyLineStrikeService).inSingletonScope();
})
