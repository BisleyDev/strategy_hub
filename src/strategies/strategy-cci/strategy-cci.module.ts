import {ContainerModule} from "inversify";
import {StrategyCciModuleEnum} from "./strategy-cci-module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalsService} from "./services/signals.service";
import {StrategyCciService} from "./services/strategy-cci.service";

export const StrategyCciModule = new ContainerModule(bind => {
    bind(StrategyCciModuleEnum.CCIIndicators).to(IndicatorsService).inSingletonScope();
    bind(StrategyCciModuleEnum.CCISignals).to(SignalsService).inSingletonScope();
    bind(StrategyCciModuleEnum.CCIStrategy).to(StrategyCciService).inSingletonScope();
})
