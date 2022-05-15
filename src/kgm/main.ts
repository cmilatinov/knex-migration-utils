import * as fs from 'fs';
import { DateTime } from 'luxon';
import 'colors';

import cliOptions, { ArgsKGM, printHelp } from './cli';
import { MigrationGenerator } from './classes/migration-generator';
import { loadArgsAndConfig } from '../common/utils/load-config';
import logger from '../common/utils/logger';

async function main() {
    try {
        // Command line args
        const { args, config } = await loadArgsAndConfig<ArgsKGM>(cliOptions, printHelp);

        // Create generator
        const generator = new MigrationGenerator(args, config);
        const comparator = generator.getComparator();
        const db = comparator.getDB();

        // Compute current and old table lists
        await generator.build();

        // Create migrations directory
        fs.mkdirSync(args.migrations, { recursive: true });

        // Generate migration code
        if (!args.reset) {
            if (comparator.hasDifferences()) {
                const timestamp = DateTime.now().toFormat('yyyyMMddHHmmss');
                const migrationFile = `${args.migrations}/${timestamp}_${args.filename}${args.typescript ? '.ts' : '.js'}`;
                generator.generate(migrationFile, args.typescript);
                logger.success(`Generated migration '${migrationFile}'.`);
            } else {
                logger.warn(`No differences were detected since the last migration. No new migration was generated.`);
            }
        } else {
            logger.warn(`Resetting database metadata. No migration will be generated.`);
        }

        // Update metadata
        await comparator.updateMetadata();

        // Close database connection (in order to stop process)
        await db.destroy();
    } catch (err) {
        logger.error(`${err.message}.`);
    }
}

main().then();