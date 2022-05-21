import knex, { Knex } from 'knex';

import { TableColumn, Table, TableIndex } from '../interfaces/table';
import { Config } from '../../common/interfaces/config';
import _ from 'lodash';
import { ArgsKGM } from '../cli';
import { EnumType } from '../interfaces/enum';

export class TableComparator {

    private readonly args: ArgsKGM;
    private readonly config: Config;
    private readonly db: Knex;

    private columnList: TableColumn[];
    private oldColumnList: TableColumn[];

    private indexList: TableIndex[];
    private oldIndexList: TableIndex[];

    private enumList: EnumType[];
    private oldEnumList: EnumType[];

    private tableList: Table[];
    private oldTableList: Table[];

    private tablesToCreate: Table[];
    private tablesToDrop: Table[];

    private columnsToAlter: [TableColumn, TableColumn][];
    private columnsToAdd: TableColumn[];
    private columnsToDrop: TableColumn[];

    private indexesToAdd: TableIndex[];
    private indexesToDrop: TableIndex[];

    private enumsToAlter: [EnumType, EnumType][];
    private enumsToAdd: EnumType[];
    private enumsToDrop: EnumType[];

    constructor(args: ArgsKGM, config: Config) {
        this.args = args;
        this.config = config;
        this.db = knex(config.database);
    }

    public getDB() {
        return this.db;
    }

    public async build() {
        await this.createTables();
        await this.getColumnLists();
        this.computeDifferences();
    }

    private async createTables() {
        // Create schema
        await this.db.schema.createSchemaIfNotExists(this.args.schema);

        // Create columns table
        if (!(await this.db.schema.withSchema(this.args.schema).hasTable('table_column'))) {
            await this.db.schema.withSchema(this.args.schema)
                .createTable('table_column', function (table) {
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

        // Create indexes table
        if (!(await this.db.schema.withSchema(this.args.schema).hasTable('table_index'))) {
            await this.db.schema.withSchema(this.args.schema)
                .createTable('table_index', function (table) {
                    table.string('schema_name').notNullable();
                    table.string('table_name').notNullable();
                    table.string('index_name').notNullable();
                    table.json('column_names').notNullable();
                    table.boolean('is_unique').notNullable();
                    table.primary(['schema_name', 'table_name', 'index_name']);
                });
        }

        // Create enums table
        if (!(await this.db.schema.withSchema(this.args.schema).hasTable('enum'))) {
            await this.db.schema.withSchema(this.args.schema)
                .createTable('enum', function (table) {
                    table.string('schema_name').notNullable();
                    table.string('enum_name').notNullable();
                    table.json('values').notNullable();
                    table.primary(['schema_name', 'enum_name']);
                });
        }
    }

    private async getColumnLists() {
        // Query current table information
        const columns = await this.db('information_schema.columns')
            .whereIn('table_schema', this.config.schemas);
        const constraints = await this.db('information_schema.table_constraints')
            .where('constraint_type', 'PRIMARY KEY')
            .whereIn('table_schema', this.config.schemas);
        const constraintColumns = await this.db('information_schema.constraint_column_usage')
            .whereIn('constraint_name', constraints.map(c => c.constraint_name));

        // Build current table list
        this.columnList = columns.map(c => ({
            schema_name: c.table_schema,
            table_name: c.table_name,
            column_name: c.column_name,
            data_type: c.udt_name,
            ordinal_position: c.ordinal_position,
            default_value: c.column_default,
            is_nullable: c.is_nullable === 'YES',
            is_primary_key: !!constraintColumns.find(cons =>
                cons.table_schema === c.table_schema &&
                cons.table_name === c.table_name &&
                cons.column_name === c.column_name)
        }));

        // Query old table information
        this.oldColumnList = await this.db(`${this.args.schema}.table_column`);

        // Build current index list
        this.indexList = await this.db(`pg_index as pgi`)
            .distinctOn('idx.oid')
            .select('tnsp.nspname as schema_name')
            .select('idx.relname as index_name')
            .select('tbl.relname as table_name')
            .select(
                this.db('pg_attribute')
                    .select(this.db.raw('json_agg(attname)'))
                    .where('attrelid', this.db.raw('idx.oid'))
                    .groupBy('attrelid')
                    .as('column_names')
            )
            .select('pgi.indisunique as is_unique')
            .innerJoin('pg_class as idx', 'idx.oid', 'pgi.indexrelid')
            .innerJoin('pg_namespace as insp', 'insp.oid', 'idx.relnamespace')
            .innerJoin('pg_class as tbl', 'tbl.oid', 'pgi.indrelid')
            .innerJoin('pg_namespace as tnsp', 'tnsp.oid', 'tbl.relnamespace')
            .where('pgi.indisprimary', false)
            .whereIn('tnsp.nspname', this.config.schemas);

        // Query old index information
        this.oldIndexList = await this.db(`${this.args.schema}.table_index`);

        // Build current enum list
        this.enumList = await this.db('pg_type as t')
            .select('n.nspname as schema_name')
            .select('t.typname as enum_name')
            .select(this.db.raw('json_agg(e.enumlabel) as values'))
            .innerJoin('pg_enum as e', 'e.enumtypid', 't.oid')
            .innerJoin('pg_namespace as n', 'n.oid', 't.typnamespace')
            .groupBy('schema_name')
            .groupBy('enum_name');

        // Query old enum information
        this.oldEnumList = await this.db(`${this.args.schema}.enum`);
    }

    private computeDifferences() {
        const tableList = _.uniq(this.columnList.map(c => `${c.schema_name}.${c.table_name}`));
        const oldTableList = _.uniq(this.oldColumnList.map(c => `${c.schema_name}.${c.table_name}`));

        const mapTable = t => {
            const parts = t.split('.');
            return {
                schema_name: parts[0],
                table_name: parts[1],
                columns: this.columnList.filter(c => c.schema_name === parts[0] && c.table_name === parts[1]),
                indexes: this.indexList.filter(i => i.schema_name === parts[0] && i.table_name === parts[1])
            };
        };

        const mapOldTable = t => {
            const parts = t.split('.');
            return {
                schema_name: parts[0],
                table_name: parts[1],
                columns: this.oldColumnList.filter(c => c.schema_name === parts[0] && c.table_name === parts[1]),
                indexes: this.oldIndexList.filter(i => i.schema_name === parts[0] && i.table_name === parts[1])
            };
        }

        this.tableList = tableList.map(mapTable);
        this.oldTableList = oldTableList.map(mapOldTable);

        const tableListToCreate = _.difference(tableList, oldTableList);
        this.tablesToCreate = tableListToCreate.map(mapTable);

        const tableListToDrop = _.difference(oldTableList, tableList);
        this.tablesToDrop = tableListToDrop.map(mapOldTable);

        this.columnsToAlter = _.differenceWith(
            _.intersectionWith(this.columnList, this.oldColumnList, TableComparator.columnEquals),
            _.intersectionWith(this.oldColumnList, this.columnList, TableComparator.columnEquals),
            _.isEqual
        ).map(dest => [this.oldColumnList.find(src => TableComparator.columnEquals(dest, src)), dest]);

        this.columnsToAdd = _.differenceWith(this.columnList, this.oldColumnList, TableComparator.columnEquals)
            .filter(c => !tableListToCreate.includes(`${c.schema_name}.${c.table_name}`));

        this.columnsToDrop = _.differenceWith(this.oldColumnList, this.columnList, TableComparator.columnEquals)
            .filter(c => !tableListToDrop.includes(`${c.schema_name}.${c.table_name}`));

        this.indexesToAdd = _.differenceWith(this.indexList, this.oldIndexList, _.isEqual)
            .filter(i => !tableListToCreate.includes(`${i.schema_name}.${i.table_name}`));

        this.indexesToDrop = _.differenceWith(this.oldIndexList, this.indexList, _.isEqual)
            .filter(i => !tableListToDrop.includes(`${i.schema_name}.${i.table_name}`));

        this.enumsToAlter = _.differenceWith(
            _.intersectionWith(this.enumList, this.oldEnumList, TableComparator.enumEquals),
            _.intersectionWith(this.oldEnumList, this.enumList, TableComparator.enumEquals),
            _.isEqual
        ).map(dest => [this.oldEnumList.find(src => TableComparator.enumEquals(dest, src)), dest]);

        this.enumsToAdd = _.differenceWith(this.enumList, this.oldEnumList, TableComparator.enumEquals)
            .filter(e => !this.enumsToAlter.find(([_, dest]) => TableComparator.enumEquals(e, dest)));

        this.enumsToDrop = _.differenceWith(this.oldEnumList, this.enumList, TableComparator.enumEquals)
            .filter(e => !this.enumsToAlter.find(([_, dest]) => TableComparator.enumEquals(e, dest)));
    }


    public hasDifferences() {
        return [
            this.tablesToCreate,
            this.tablesToDrop,
            this.columnsToAlter,
            this.columnsToAdd,
            this.columnsToDrop,
            this.indexesToAdd,
            this.indexesToDrop
        ].some(arr => arr.length > 0);
    }

    public getDifferencesInfo() {
        return {
            columnList: this.columnList,
            oldColumnList: this.oldColumnList,
            tableList: this.tableList,
            oldTableList: this.oldTableList,
            tablesToCreate: this.tablesToCreate,
            tablesToDrop: this.tablesToDrop,
            columnsToAlter: this.columnsToAlter,
            columnsToAdd: this.columnsToAdd,
            columnsToDrop: this.columnsToDrop,
            indexesToAdd: this.indexesToAdd,
            indexesToDrop: this.indexesToDrop
        };
    }

    public async updateMetadata() {
        const columnTable = `${this.args.schema}.table_column`;
        const indexTable = `${this.args.schema}.table_index`;
        const enumTable = `${this.args.schema}.enum`;

        // Truncate tables
        await this.db(columnTable).truncate();
        await this.db(indexTable).truncate();
        await this.db(enumTable).truncate();

        // Add new columns
        if (this.columnList.length > 0) {
            await this.db(columnTable)
                .insert(this.columnList);
        }

        // Add new indexes
        if (this.indexList.length > 0) {
            await this.db(indexTable)
                .insert(this.indexList.map(i => ({
                    ...i,
                    column_names: JSON.stringify(i.column_names)
                })));
        }

        // Add new enums
        if (this.enumList.length > 0) {
            await this.db(enumTable)
                .insert(this.enumList.map(e => ({
                    ...e,
                    values: JSON.stringify(e.values)
                })));
        }
    }

    public static columnEquals(a: TableColumn, b: TableColumn) {
        return _.isEqual({
            schema_name: a.schema_name,
            table_name: a.table_name,
            ordinal_position: a.ordinal_position
        }, {
            schema_name: b.schema_name,
            table_name: b.table_name,
            ordinal_position: b.ordinal_position
        });
    }

    public static enumEquals(a: EnumType, b: EnumType) {
        return _.isEqual({
            schema_name: a.schema_name,
            enum_name: a.enum_name
        }, {
            schema_name: b.schema_name,
            enum_name: b.enum_name
        });
    }
}