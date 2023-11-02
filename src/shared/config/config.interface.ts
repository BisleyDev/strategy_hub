import {TestSymbolWalletInterface} from "../types/testSymbolWallet.interface";
import {IntervalEnum} from "../types/interval.enum";
import {AccountsEnum} from "../types/accounts.enum";
import {InstanceStrategyEnum} from "../types/instance-strategy.enum";

export interface ConfigInterface {
    "Symbols": TestSymbolWalletInterface[],
    "env": InstanceStrategyEnum,
    "API_URLS": {
        "BinanceBaseRest": string,
        "BinanceAlternativeRest": string
    },
    "MAX_BARS_LIMIT": number,
    "Indicators_Params": {
        "account": AccountsEnum,
        "stopLimit": number,
        "RSI": {
            "interval": IntervalEnum,
            "length": number,
            "SMA_length": number,
            "upperBand": number,
            "lowerBand": number
        },
        "MACD": {
            "interval": IntervalEnum,
            "fast": number,
            "slow": number,
            "signal": number
        }
    },
    "RsiPeaks": {
        "account": AccountsEnum,
        "interval": IntervalEnum,
        "stopLimit": number,
        "RSI": {
            "interval": IntervalEnum,
            "length": number,
            "SMA_length": number,
            "upperBand": number,
            "lowerBand": number
        }
    },
    "CCI": {
        "interval": IntervalEnum,
        "account": AccountsEnum,
        "CCI": {
            "interval": IntervalEnum,
            "length": number,
            "upperBand": number,
            "lowerBand": number
        },
        "SMA": {
            "interval": IntervalEnum,
            "length": number
        }
    },
    "strategy2": {
        "account": AccountsEnum,
        "stopLimit": number,
        "RSI": {
            "interval": IntervalEnum,
            "length": number,
            "SMA_length": number,
            "upperBand": number,
            "lowerBand": number
        },
        "MACD": {
            "interval": IntervalEnum,
            "fast": number,
            "slow": number,
            "signal": number
        }
    },
    "pinBar": {
        "interval": IntervalEnum,
        "account": AccountsEnum,
        "MACD": {
            "interval": IntervalEnum,
            "fast": number,
            "slow": number,
            "signal": number
        }
    },
    "DiffVolume": {
        "interval": IntervalEnum,
        "account": AccountsEnum,
        "volume": {
            "MA": number
        }
    },
    "lineStrike": {
        "interval": IntervalEnum,
        "account": AccountsEnum,
        "MACD": {
            "interval": IntervalEnum,
            "fast": number,
            "slow": number,
            "signal": number
        }
    },
    "test_env": {
        "fromDate": string | number,
        "toDate": string | number,
        "fileName": string,
        "description": string
    }
}
