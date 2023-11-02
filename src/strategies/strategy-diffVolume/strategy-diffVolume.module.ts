import {ContainerModule} from "inversify";
import {StrategyDiffVolumeModuleEnum} from "./strategy-diffVolume.module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalService} from "./services/signal.service";
import {StrategyDiffVolumeService} from "./services/strategy-diffVolume.service";


export const StrategyDiffVolumeModule = new ContainerModule(bind => {
    bind(StrategyDiffVolumeModuleEnum.DiffVolumeIndicator).to(IndicatorsService).inSingletonScope();
    bind(StrategyDiffVolumeModuleEnum.DiffVolumeSignal).to(SignalService).inSingletonScope();
    bind(StrategyDiffVolumeModuleEnum.DiffVolumeStrategy).to(StrategyDiffVolumeService).inSingletonScope();
})
