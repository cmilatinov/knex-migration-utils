import * as path from 'path';
import * as fs from 'fs';
import commandLineArgs from 'command-line-args';
import { OptionDefinition } from 'command-line-usage';

import logger from './logger';
import { Config } from '../interfaces/config';

export interface ArgsBase {
    config: string;
    help: boolean;
}

export async function loadConfig(configPath: string) {
    const moduleName = path.basename(configPath);
    const dir = path.join(process.cwd(), path.dirname(configPath));
    const moduleFile = fs.readdirSync(dir)
        .find(f => path.basename(f, path.extname(f)) === moduleName);
    const module = await import(`${dir}/${moduleFile}`);
    return module.default || module;
}

export async function loadArgsAndConfig<T extends ArgsBase>(cliOptions: OptionDefinition[], printHelp: () => void) {
    // Command line args
    const args = commandLineArgs(cliOptions) as T;

    // Print help
    if (args.help) {
        printHelp();
        process.exit(0);
    }

    // Load config file
    let config: Config;
    try {
        config = await loadConfig(args.config);
    } catch (err) {
        console.log(err);
        logger.error(`Config module '${args.config}' not found. ` +
            `Please verify that the file exists and try again.`);
    }

    // Check database config
    if (!config.database) {
        logger.error(`Missing database configuration. ` +
            `Please verify that your config module returns an object with the 'database' key.`);
    }

    // Check schema database config
    if (!config.schemas ||
        !Array.isArray(config.schemas) ||
        (Array.isArray(config.schemas) && config.schemas.length <= 0)) {
        logger.error(`Missing schema list in configuration. ` +
            `Please verify that your config module returns a non-empty string array with the 'schemas' key.`);
    }

    return { args, config };
}