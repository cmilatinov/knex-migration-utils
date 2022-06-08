#!/usr/bin/env node
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const knex_1 = __importDefault(require("knex"));
require("colors");
const load_config_1 = require("../common/utils/load-config");
const logger_1 = __importDefault(require("../common/utils/logger"));
const cli_1 = __importStar(require("./cli"));
// TODO: Abstract this into another file as it is specific to sql dialects
const typeMapping = {
    uuid: 'string',
    text: 'string',
    varchar: 'string',
    bpchar: 'string',
    boolean: 'boolean',
    bool: 'boolean',
    smallint: 'number',
    int: 'number',
    bigint: 'number',
    int2: 'number',
    int4: 'number',
    int8: 'number',
    float: 'number',
    float2: 'number',
    float4: 'number',
    float8: 'number',
    timestamptz: 'string',
    timestamp: 'string',
    json: 'any',
    jsonb: 'any'
};
function camelCase(str) {
    str = lodash_1.default.camelCase(str);
    return `${str.charAt(0).toUpperCase()}${str.substring(1)}`;
}
async function main() {
    try {
        // Command line args
        const { args, config } = await (0, load_config_1.loadArgsAndConfig)(cli_1.default, cli_1.printHelp);
        // Knex object
        const db = (0, knex_1.default)(config.database);
        // Query table columns
        const tableColumns = await db('information_schema.columns')
            .whereIn('table_schema', config.schemas)
            .orderBy('table_schema')
            .orderBy('table_name')
            .orderBy('ordinal_position');
        const tables = new Map();
        // Fill table map
        tableColumns.forEach((column) => {
            const info = tables.get(column.table_name) || {
                table: '',
                columns: [],
                schema: ''
            };
            const type = typeMapping[column.udt_name];
            if (!type) {
                logger_1.default.error(`Missing type mapping for '${column.udt_name}'`);
            }
            info.table = column.table_name;
            info.columns.push({
                name: column.column_name,
                type,
                column_default: column.column_default,
                is_nullable: column.is_nullable === 'YES'
            });
            info.schema = column.table_schema;
            tables.set(info.table, info);
        });
        // Generate type source
        let typeSrc = '/* eslint-disable */\n';
        typeSrc += `import { Column, Table } from '@wwwouter/typed-knex';\n\n`;
        tables.forEach(({ table, columns, schema }) => {
            let typeDef = `@Table('${schema}.${table}')\n`;
            typeDef += `export class ${camelCase(table)} {\n`;
            columns.forEach((c) => {
                typeDef += `    @Column()\n`;
                typeDef += `    public ${c.name}${c.column_default || c.is_nullable ? '?' : ''}: ${c.type};\n`;
            });
            typeDef += `}`;
            typeSrc += `${typeDef}\n\n`;
        });
        // Write types file
        const dir = path.dirname(args.filename);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(args.filename, typeSrc);
        logger_1.default.success(`Generated types file '${args.filename}'.`);
        // Close database connection (in order to stop process)
        await db.destroy();
    }
    catch (err) {
        logger_1.default.error(`${err.message}.`);
    }
}
main().then();
