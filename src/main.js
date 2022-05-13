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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const luxon_1 = require("luxon");
const migration_generator_1 = require("./migration-generator");
const cli_1 = __importDefault(require("./cli"));
async function main() {
    // Command line args
    const args = (0, command_line_args_1.default)(cli_1.default);
    // Load config file
    const config = (await Promise.resolve().then(() => __importStar(require(`${path.join(process.cwd(), args.config)}`)))).default();
    // Create comparator
    const generator = new migration_generator_1.MigrationGenerator(config);
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
    const timestamp = luxon_1.DateTime.now().toFormat('yyyyMMddHHmmss');
    generator.generate(`${args.migrations}/${timestamp}_${args.file}${args.typescript ? '.ts' : '.js'}`, args.typescript);
    // Truncate columns table
    await db('dev.table_columns').truncate();
    // Add new columns
    await db('dev.table_columns')
        .insert(comparator.getColumns());
    // Close database connection (in order to stop process)
    await db.destroy();
}
main().then();
