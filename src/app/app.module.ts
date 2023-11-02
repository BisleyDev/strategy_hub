import {ContainerModule} from "inversify";
import {AppModuleEnum} from "./app-module.enum";
import {App} from "./app";

export const AppModule = new ContainerModule(bind => {
    bind(AppModuleEnum.Application).to(App)
})
