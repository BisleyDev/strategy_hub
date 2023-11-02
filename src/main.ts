import {App} from "./app/app";
import {Container} from "inversify";
import {ApiModule} from "./api/api.module";
import {SharedModule} from "./shared/shared.module";
import {AppModule} from "./app/app.module";
import {AppModuleEnum} from "./app/app-module.enum";
import {StrategyRsiModule} from "./strategies/strategy-rsi/strategy-rsi.module";
import {DatabaseModule} from "./database/database.module";
import {StrategyPinBarModule} from "./strategies/strategy-pinBar/strategy-pinBar.module";
import {StrategyRsiPeaksModule} from "./strategies/strategy-rsiPeaks/strategy-rsiPeaks.module";
import {StrategyLineStrikeModule} from "./strategies/strategy-line-strike/strategy-line-strike.module";
import {StrategyCciModule} from "./strategies/strategy-cci/strategy-cci.module";
import {StrategyDiffVolumeModule} from "./strategies/strategy-diffVolume/strategy-diffVolume.module";

async function bootstrap() {
    const appContainer = new Container();
    appContainer.load(ApiModule, SharedModule, AppModule, StrategyRsiModule, DatabaseModule, StrategyPinBarModule, StrategyRsiPeaksModule, StrategyLineStrikeModule, StrategyCciModule, StrategyDiffVolumeModule)
    const app = appContainer.get<App>(AppModuleEnum.Application)
    await app.init()
}

bootstrap();
