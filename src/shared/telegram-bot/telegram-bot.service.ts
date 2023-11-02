import {inject, injectable} from "inversify";
import {SharedModuleEnum} from "../shared-module.enum";
import {ConfigService} from "../config/config.service";

const TelegramBot = require('node-telegram-bot-api');

@injectable()
export class TelegramBotService {

    private client: any;
    chatId = 339893911

    constructor(
        @inject(SharedModuleEnum.config) private _configService: ConfigService,
    ) {}

    get bot() {
        if (!this.client) this.init();
        return this.client
    }

    init() {
        //todo change
        const key = this._configService.config.env === "prod" ? 'TELEGRAM_API' : 'TELEGRAM_API_DEV';
        this.client = new TelegramBot(this._configService.getEnv(key), {polling: true});
    }

    sendMessage(text: string) {
        this.bot.sendMessage(this.chatId, text);
    }



}
