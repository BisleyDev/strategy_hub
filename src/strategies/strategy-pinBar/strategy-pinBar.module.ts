import {ContainerModule} from "inversify";
import {StrategyPinBarModuleEnum} from "./strategy-pinBar-module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalsService} from "./services/signals.service";
import {StrategyPinBarService} from "./services/strategy-pinBar.service";

export const StrategyPinBarModule = new ContainerModule(bind => {
    bind(StrategyPinBarModuleEnum.PinBarIndicators).to(IndicatorsService).inSingletonScope();
    bind(StrategyPinBarModuleEnum.PinBarSignals).to(SignalsService).inSingletonScope();
    bind(StrategyPinBarModuleEnum.PinBarStrategy).to(StrategyPinBarService).inSingletonScope();
})
