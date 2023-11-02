import {ContainerModule} from "inversify";
import {Strategy2ModuleEnum} from "./strategy2.module.enum";
import {IndicatorsService} from "./services/indicators.service";
import {SignalsService} from "./services/signals.service";
import {Strategy2Service} from "./services/strategy2.service";

export const Strategy2Module = new ContainerModule(bind => {
    bind(Strategy2ModuleEnum.strategy2Indicators).to(IndicatorsService).inSingletonScope();
    bind(Strategy2ModuleEnum.strategy2Signals).to(SignalsService);
    bind(Strategy2ModuleEnum.strategy2Strategy).to(Strategy2Service).inSingletonScope();
})
