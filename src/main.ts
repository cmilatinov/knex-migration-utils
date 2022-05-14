import commandLineArgs from 'command-line-args';
import * as fs from 'fs';
import { DateTime } from 'luxon';
import 'colors';

import loadModule from './load-module';
import { MigrationGenerator } from './migration-generator';
import cliOptions, { ArgsObject } from './cli';
import logger from './logger';

async function main() {
    // Command line args
    const args = commandLineArgs(cliOptions) as ArgsObject;

    try {

        // Load config file
        let config;
        try {
            config = (await loadModule(args.config))();
        } catch (err) {
            console.log(err);
            logger.error(`Config module '${args.config}' not found. Please verify that the file exists and try again.`);
        }

        // Check database config
        if (!config.database) {
            logger.error(`Missing database configuration. Please verify that your config module returns an object with the 'database' key.`);
        }

        // Check schema database config
        if (!config.schemas || !Array.isArray(config.schemas) || (Array.isArray(config.schemas) && config.schemas.length <= 0)) {
            logger.error(`Missing schema list in configuration. Please verify that your config module returns a non-empty array with the 'schemas' key.`);
        }

        // Create generator
        const generator = new MigrationGenerator(args, config);
        const comparator = generator.getComparator();
        const db = comparator.getDB();

        // Compute current and old table lists
        await generator.build();

        // Create migrations directory
        fs.mkdirSync(args.migrations, { recursive: true });

        // Generate migration code
        if (comparator.hasDifferences()) {
            const timestamp = DateTime.now().toFormat('yyyyMMddHHmmss');
            const migrationFile = `${args.migrations}/${timestamp}_${args.file}${args.typescript ? '.ts' : '.js'}`;
            generator.generate(migrationFile, args.typescript);
            logger.success(`Generated migration '${migrationFile}'.`);
        } else {
            logger.warn(`No differences were detected since the last migration. No new migration was generated.`);
        }

        // Truncate columns table
        await db(`${args.schema}.table_column`).truncate();

        // Add new columns
        const { columnList } = comparator.getDifferencesInfo();
        if (columnList.length > 0) {
            await db(`${args.schema}.table_column`)
                .insert(comparator.getColumns());
        }

        // Close database connection (in order to stop process)
        await db.destroy();

    } catch (err) {
        logger.error(err.message);
    }
}

main().then();