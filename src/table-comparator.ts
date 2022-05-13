import knex, { Knex } from 'knex';

import { TableColumn, Table } from './interfaces/table';
import { Config } from './interfaces/config';
import _ from 'lodash';

export class TableComparator {

    private readonly config: Config;
    private readonly db: Knex;

    private columnList: TableColumn[];
    private oldColumnList: TableColumn[];

    private tableList: Table[];
    private oldTableList: Table[];

    private tablesToCreate: Table[];
    private tablesToDrop: Table[];

    private columnsToAlter: [TableColumn, TableColumn][];
    private columnsToAdd: TableColumn[];
    private columnsToDrop: TableColumn[];

    constructor(config: Config) {
        this.config = config;
        this.db = knex(config.database);
    }

    public getDB() {
        return this.db;
    }

    public async build() {
        await this.getColumnLists();
        this.computeDifferences();
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
            is_nullable: c.is_nullable === 'YES',
            default_value: c.column_default,
            is_primary_key: !!constraintColumns.find(cons =>
                cons.table_schema === c.table_schema &&
                cons.table_name === c.table_name &&
                cons.column_name === c.column_name)
        }));

        // Query old table information
        this.oldColumnList = await this.db('dev.table_columns');
    }

    private computeDifferences() {
        const tableList = _.uniq(this.columnList.map(c => `${c.schema_name}.${c.table_name}`));
        const oldTableList = _.uniq(this.oldColumnList.map(c => `${c.schema_name}.${c.table_name}`));

        const mapTable = t => {
            const parts = t.split('.');
            return {
                schema_name: parts[0],
                table_name: parts[1],
                columns: this.columnList.filter(c => c.schema_name === parts[0] && c.table_name === parts[1])
            };
        };

        const mapOldTable = t => {
            const parts = t.split('.');
            return {
                schema_name: parts[0],
                table_name: parts[1],
                columns: this.oldColumnList.filter(c => c.schema_name === parts[0] && c.table_name === parts[1])
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

        this.columnsToAdd = _.differenceWith(this.columnList, this.oldColumnList, _.isEqual)
            .filter(c => !tableListToCreate.includes(`${c.schema_name}.${c.table_name}`) &&
                !this.columnsToAlter.find(([_, dest]) => TableComparator.columnEquals(c, dest)));

        this.columnsToDrop = _.differenceWith(this.oldColumnList, this.columnList, _.isEqual)
            .filter(c => !tableListToDrop.includes(`${c.schema_name}.${c.table_name}`) &&
                !this.columnsToAlter.find(([_, dest]) => TableComparator.columnEquals(c, dest)));
    }

    public getTables() {
        return this.tableList;
    }

    public getOldTables() {
        return this.oldTableList;
    }

    public getTablesToCreate() {
        return this.tablesToCreate;
    }

    public getTablesToDrop() {
        return this.tablesToDrop;
    }

    public getColumnsToAdd() {
        return this.columnsToAdd;
    }

    public getColumnsToDrop() {
        return this.columnsToDrop;
    }

    public getColumnsToAlter() {
        return this.columnsToAlter;
    }

    public getColumns() {
        return this.columnList;
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
}