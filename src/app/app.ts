import express, {Express} from "express";
import {Server} from "http";
import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../shared/shared-module.enum";
import {ConfigService} from "../shared/config/config.service";
import {ApiModuleEnum} from "../api/api-module.enum";
import {BinanceClientService} from "../api/binance/binance-client.service";
import {PrismaService} from "../database/prisma.service";
import {DatabaseEnum} from "../database/database.enum";
import {TelegramBotService} from "../shared/telegram-bot/telegram-bot.service";
import {BinanceMarginClientService} from "../api/binance/binance-margin-client.service";
import {StrategyPinBarModuleEnum} from "../strategies/strategy-pinBar/strategy-pinBar-module.enum";
import {StrategyPinBarService} from "../strategies/strategy-pinBar/services/strategy-pinBar.service";
import {StrategyRsiPeaksModuleEnum} from "../strategies/strategy-rsiPeaks/strategy-rsiPeaks-module.enum";
import {StrategyRsiPeaksService} from "../strategies/strategy-rsiPeaks/services/strategy-rsiPeaks.service";
import {StrategyLineStrikeModuleEnum} from "../strategies/strategy-line-strike/strategy-line-strike-module.enum";
import {StrategyLineStrikeService} from "../strategies/strategy-line-strike/services/strategy-line-strike.service";
import {StrategyCciService} from "../strategies/strategy-cci/services/strategy-cci.service";
import {StrategyCciModuleEnum} from "../strategies/strategy-cci/strategy-cci-module.enum";
import {StrategyDiffVolumeModuleEnum} from "../strategies/strategy-diffVolume/strategy-diffVolume.module.enum";
import {StrategyDiffVolumeService} from "../strategies/strategy-diffVolume/services/strategy-diffVolume.service";

@injectable()
export class App {
    app: Express;
    port: number;
    server: Server;


    constructor(
        @inject(StrategyDiffVolumeModuleEnum.DiffVolumeStrategy) private _strategyDiffVolume: StrategyDiffVolumeService,
        // @inject(StrategyPinBarModuleEnum.PinBarStrategy) private _strategyPinBar: StrategyPinBarService,
        // @inject(StrategyRsiPeaksModuleEnum.RsiPeaksStrategy) private _strategyRsiPeaks: StrategyRsiPeaksService,
        // @inject(StrategyLineStrikeModuleEnum.LineStrikeStrategy) private _strategyLineStrike: StrategyLineStrikeService,
        // @inject(StrategyCciModuleEnum.CCIStrategy) private _strategyCCI: StrategyCciService,
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
        @inject(ApiModuleEnum.binanceClient) private _binanceClient: BinanceClientService,
        @inject(ApiModuleEnum.binanceMarginClient) private _binanceMargin: BinanceMarginClientService,
        @inject(DatabaseEnum.prismaService) private _prismaService: PrismaService,
        @inject(SharedModuleEnum.telegramBot) private _telegramBot: TelegramBotService,

    ) {
        this.app = express()
        this.port = 8000;
    }

    public async init() {
        await this._prismaService.connect();
        this.server = this.app.listen(this.port);
        console.log(`Server started port - ${this.port}`)
        await this._strategyDiffVolume.start();
        // await this._strategyRsiPeaks.start();
        // await this._strategyPinBar.start();
        // await this._strategyCCI.start();


    }
}
