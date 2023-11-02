import {injectable} from "inversify";
import 'reflect-metadata';
import {ConfigInterface} from "./config.interface";
import configData from '../../config/config.json';
import {DotenvParseOutput, config} from "dotenv";


@injectable()
export class ConfigService {
    private _config: ConfigInterface;
    private readonly _env: DotenvParseOutput;


    constructor(

    ) {
        this._config = require('../../config/config.json');
        const env = config();
        if (env.error) {
            console.error('[ConfigService] not read file .env');
        } else {
            console.log('[ConfigService] config .env is loaded');
            this._env = env.parsed as DotenvParseOutput;
        }
    }

    get config(): ConfigInterface  {
        return this._config;
    }

    get configStrategy2() {
        return this._config.strategy2;
    }
    //
    // public async init() {
    //     console.log(config.env);
    //     if (this._config) return;
    //     this._config = await require('../../config/config.json');
    // }

    getEnv<T extends string | number>(key: string): T {
        return this._env[key] as T;
    }
}
