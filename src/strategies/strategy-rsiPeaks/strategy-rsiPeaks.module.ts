import {ContainerModule} from "inversify";
import {StrategyRsiPeaksModuleEnum} from "./strategy-rsiPeaks-module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalsService} from "./services/signals.service";
import {StrategyRsiPeaksService} from "./services/strategy-rsiPeaks.service";

export const StrategyRsiPeaksModule = new ContainerModule(bind => {
    bind(StrategyRsiPeaksModuleEnum.RsiPeaksIndicators).to(IndicatorsService).inSingletonScope();
    bind(StrategyRsiPeaksModuleEnum.RsiPeaksSignals).to(SignalsService).inSingletonScope();
    bind(StrategyRsiPeaksModuleEnum.RsiPeaksStrategy).to(StrategyRsiPeaksService).inSingletonScope();
})
