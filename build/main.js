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
const command_line_args_1 = __importDefault(require("command-line-args"));
const fs = __importStar(require("fs"));
const luxon_1 = require("luxon");
require("colors");
const load_module_1 = __importDefault(require("./load-module"));
const migration_generator_1 = require("./migration-generator");
const cli_1 = __importDefault(require("./cli"));
const logger_1 = __importDefault(require("./logger"));
async function main() {
    // Command line args
    const args = (0, command_line_args_1.default)(cli_1.default);
    try {
        // Load config file
        let config;
        try {
            config = (await (0, load_module_1.default)(args.config))();
        }
        catch (err) {
            console.log(err);
            logger_1.default.error(`Config module '${args.config}' not found. Please verify that the file exists and try again.`);
        }
        // Check database config
        if (!config.database) {
            logger_1.default.error(`Missing database configuration. Please verify that your config module returns an object with the 'database' key.`);
        }
        // Check schema database config
        if (!config.schemas || !Array.isArray(config.schemas) || (Array.isArray(config.schemas) && config.schemas.length <= 0)) {
            logger_1.default.error(`Missing schema list in configuration. Please verify that your config module returns a non-empty array with the 'schemas' key.`);
        }
        // Create generator
        const generator = new migration_generator_1.MigrationGenerator(args, config);
        const comparator = generator.getComparator();
        const db = comparator.getDB();
        // Create columns table
        await db.schema.createSchemaIfNotExists(args.schema);
        if (!(await db.schema.withSchema(args.schema).hasTable('table_columns'))) {
            await db.schema.withSchema(args.schema)
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
        if (comparator.hasDifferences()) {
            const timestamp = luxon_1.DateTime.now().toFormat('yyyyMMddHHmmss');
            const migrationFile = `${args.migrations}/${timestamp}_${args.file}${args.typescript ? '.ts' : '.js'}`;
            generator.generate(migrationFile, args.typescript);
            logger_1.default.success(`Generated migration '${migrationFile}'.`);
        }
        else {
            logger_1.default.warn(`No differences were detected since the last migration. No new migration was generated.`);
        }
        // Truncate columns table
        await db(`${args.schema}.table_columns`).truncate();
        // Add new columns
        const { columnList } = comparator.getDifferencesInfo();
        if (columnList.length > 0) {
            await db(`${args.schema}.table_columns`)
                .insert(comparator.getColumns());
        }
        // Close database connection (in order to stop process)
        await db.destroy();
    }
    catch (err) {
        logger_1.default.error(err.message);
    }
}
main().then();
