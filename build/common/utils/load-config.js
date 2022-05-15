"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadArgsAndConfig = exports.loadConfig = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const command_line_args_1 = __importDefault(require("command-line-args"));
const logger_1 = __importDefault(require("./logger"));
function loadConfig(moduleName) {
    const dir = path.join(process.cwd(), path.dirname(moduleName));
    const module = fs.readdirSync(dir)
        .find(f => path.basename(f, path.extname(f)) === moduleName);
    return require(`${dir}/${module}`);
}
exports.loadConfig = loadConfig;
async function loadArgsAndConfig(cliOptions, printHelp) {
    // Command line args
    const args = (0, command_line_args_1.default)(cliOptions);
    // Print help
    if (args.help) {
        printHelp();
        process.exit(0);
    }
    // Load config file
    let config;
    try {
        config = (await loadConfig(args.config))();
    }
    catch (err) {
        console.log(err);
        logger_1.default.error(`Config module '${args.config}' not found. ` +
            `Please verify that the file exists and try again.`);
    }
    // Check database config
    if (!config.database) {
        logger_1.default.error(`Missing database configuration. ` +
            `Please verify that your config module returns an object with the 'database' key.`);
    }
    // Check schema database config
    if (!config.schemas ||
        !Array.isArray(config.schemas) ||
        (Array.isArray(config.schemas) && config.schemas.length <= 0)) {
        logger_1.default.error(`Missing schema list in configuration. ` +
            `Please verify that your config module returns a non-empty string array with the 'schemas' key.`);
    }
    return { args, config };
}
exports.loadArgsAndConfig = loadArgsAndConfig;
