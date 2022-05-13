import commandLineArgs from 'command-line-args';
import * as path from 'path';
import * as fs from 'fs';
import { DateTime } from 'luxon';

import { MigrationGenerator } from './migration-generator';
import cliOptions from './cli';

async function main() {
    // Command line args
    const args = commandLineArgs(cliOptions);

    // Load config file
    const config = (await import(`${path.join(process.cwd(), args.config)}`)).default();

    // Create generator
    const generator = new MigrationGenerator(config);
    const comparator = generator.getComparator();
    const db = comparator.getDB();

    // Create dev column table
    await db.schema.createSchemaIfNotExists('dev');
    if (!(await db.schema.withSchema('dev').hasTable('table_columns'))) {
        await db.schema.withSchema('dev')
            .createTable('table_columns', function (table) {
                table.string('schema_name').notNullable();
                table.string('table_name').notNullable();
                table.string('column_name').notNullable();
                table.integer('ordinal_position').notNullable();
                table.string('data_type').notNullable();
                table.boolean('is_nullable').notNullable();
                table.boolean('is_primary_key').notNullable();
                table.string('default_value').nullable();
                table.primary(['schema_name', 'table_name', 'column_name', 'ordinal_position']);
            });
    }

    // Compute current and old table lists
    await generator.build();

    // Create migrations directory
    fs.mkdirSync(args.migrations, { recursive: true });

    // Generate migration code
    const timestamp = DateTime.now().toFormat('yyyyMMddHHmmss');
    generator.generate(`${args.migrations}/${timestamp}_${args.file}${args.typescript ? '.ts' : '.js'}`,
        args.typescript);

    // Truncate columns table
    await db('dev.table_columns').truncate();

    // Add new columns
    await db('dev.table_columns')
        .insert(comparator.getColumns());

    // Close database connection (in order to stop process)
    await db.destroy();
}

main().then();