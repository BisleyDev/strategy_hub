import {Logger} from "tslog";
import {inject, injectable} from "inversify";
import 'reflect-metadata';
import {SharedModuleEnum} from "../shared-module.enum";
import {ConfigService} from "../config/config.service";
import * as fs from "fs";
import {v4 as uuidv4} from 'uuid';
import {TelegramBotService} from "../telegram-bot/telegram-bot.service";


@injectable()
export class LoggerService {
    logger: Logger;
    date = new Date().toString();

    constructor(
        @inject(SharedModuleEnum.config) private _config: ConfigService,
        @inject(SharedModuleEnum.telegramBot) private _telegramBot: TelegramBotService,

    ) {
        this.logger = new Logger({
            displayInstanceName: false,
            displayLoggerName: false,
            displayFilePath: "hidden",
            displayFunctionName: false
        })
    }

    getPath(state: string) {
        const nameFile = this._config.config.test_env.fileName ||
            this._config.config?.env + '-' + this.date.replace(/ /g, '_').slice(0, this.date.indexOf('G') - 1)
        return `src/log/${state}/${nameFile}.log`
    }

    log(...args: unknown[]) {
        console.log(...args)
    }
    error(...args: unknown[]) {
        const data = args.reduce((previousValue, currentValue) => (previousValue + ' ' + JSON.stringify(currentValue)), '')
        fs.appendFileSync(this.getPath('errors'), `${JSON.stringify(data)}`);
        console.log(data);
        if (this._config.config?.env === "prod") {
            this._telegramBot.sendMessage(JSON.stringify(data))
        }
    }
    warn(...args: unknown[]) {
        this.logger.warn(...args)
    }

    result(...args: unknown[]) {
        // const data = args.length === 1 ? args[0] : args;
        const data = args.reduce((previousValue, currentValue) => (previousValue + ' ' + JSON.stringify(currentValue)), '')
        fs.appendFileSync(this.getPath('strategy'), JSON.stringify(data))
        console.log(data)
        if (this._config.config?.env === "prod") {
            this._telegramBot.sendMessage(JSON.stringify(data))
        }
    }

}
