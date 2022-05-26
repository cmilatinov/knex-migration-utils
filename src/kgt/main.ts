#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';
import knex from 'knex';
import 'colors';

import { loadArgsAndConfig } from '../common/utils/load-config';
import logger from '../common/utils/logger';
import cliOptions, { ArgsKGT, printHelp } from './cli';

// TODO: Abstract this into another file as it is specific to sql dialects
const typeMapping: { [key: string]: string } = {
    varchar: 'string',
    text: 'string',
    int2: 'number',
    int4: 'number',
    int8: 'number',
    int: 'number',
    float2: 'number',
    float4: 'number',
    float8: 'number',
    float: 'number',
    timestamptz: 'string',
    timestamp: 'string',
    json: 'any',
    jsonb: 'any',
    uuid: 'string'
};

function camelCase(str: string) {
    str = _.camelCase(str);
    return `${str.charAt(0).toUpperCase()}${str.substring(1)}`;
}

async function main() {
    try {
        // Command line args
        const { args, config } = await loadArgsAndConfig<ArgsKGT>(cliOptions, printHelp);

        // Knex object
        const db = knex<any, Record<string, any>[]>(config.database);

        // Query table columns
        const tableColumns = await db('information_schema.columns')
            .whereIn('table_schema', config.schemas)
            .orderBy('table_schema')
            .orderBy('table_name')
            .orderBy('ordinal_position');

        // Table map
        type TableInfo = {
            table: string;
            columns: {
                type: string;
                name: string;
                column_default?: string;
                is_nullable: boolean;
            }[];
            schema: string;
        };
        const tables = new Map<string, TableInfo>();

        // Fill table map
        tableColumns.forEach((column) => {
            const info = tables.get(column.table_name) || {
                table: '',
                columns: [],
                schema: ''
            };
            const type = typeMapping[column.udt_name];
            if (!type) {
                logger.error(`Missing type mapping for '${column.udt_name}'`);
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
                typeDef += `    public ${c.name}${
                    c.column_default || c.is_nullable ? '?' : ''
                }: ${c.type};\n`;
            });
            typeDef += `}`;
            typeSrc += `${typeDef}\n\n`;
        });

        // Write types file
        const dir = path.dirname(args.filename);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(args.filename, typeSrc);
        logger.success(`Generated types file '${args.filename}'.`);

        // Close database connection (in order to stop process)
        await db.destroy();
    } catch (err) {
        logger.error(`${err.message}.`);
    }
}

main().then();
