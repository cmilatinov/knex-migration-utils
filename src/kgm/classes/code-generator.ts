import _ from 'lodash';

import { Table, TableColumn, TableIndex } from '../interfaces/table';
import { TableComparator } from './table-comparator';

// TODO: Abstract this into another file as it is specific to sql dialects
const typeMapping: { [key: string]: (str: string) => string } = {
    uuid: column => `uuid(${column})`,
    varchar: column => `string(${column})`,
    boolean: column => `boolean(${column})`,
    bool: column => `boolean(${column})`,
    int4: column => `integer(${column})`,
    int8: column => `integer(${column})`,
    timestamptz: column => `timestamp(${column}, { useTz: true })`,
    timestamp: column => `timestamp(${column}, { useTz: false })`
};

export class CodeGenerator {

    private _code: string;

    constructor() {
        this._code = '';
    }

    public line(code: string = '', lineEnd: string = '\n', lineStart: string = '    ') {
        this._code += `${lineStart}${code}${lineEnd}`;
    }

    private generateColumn(column: TableColumn) {
        this.line(`    table.${CodeGenerator.mapType(column.data_type, column.column_name)}`);
        this.line(`        ${column.is_nullable ? '.nullable()' : '.notNullable()'}`, '');
        if (column.default_value)
            this.line(`        .defaultTo(knex.raw('${column.default_value}'))`, '', '\n    ');
    }

    private createColumn(column: TableColumn) {
        this.generateColumn(column);
        this.line(';', '\n', '');
    }

    private alterColumn(column: TableColumn) {
        this.generateColumn(column);
        this.line(`        .alter();`, '\n', '\n    ');
    }

    private dropIndex(index: TableIndex) {
        if (index.is_unique) {
            this.line(`    table.dropUnique(null, '${index.index_name}');`);
        } else {
            this.line(`    table.dropIndex(null, '${index.index_name}');`);
        }
    }

    private addIndex(index: TableIndex) {
        const columns = index.column_names.map(c => `'${c}'`).join(', ');
        if (index.is_unique) {
            this.line(`    table.unique([${columns}], { indexName: '${index.index_name}' });`);
        } else {
            this.line(`    table.index([${columns}], '${index.index_name}');`);
        }
    }

    private dropPrimary(table: Table) {
        this.alterTableBegin(table);
        this.line(`    table.dropPrimary();`);
        this.alterTableEnd();
    }

    private addPrimary(table: Table) {
        this.alterTableBegin(table);
        this.setPrimary(table);
        this.alterTableEnd();
    }

    private setPrimary(table: Table) {
        const pkColumns = table.columns.filter(c => c.is_primary_key);
        if (pkColumns.length > 0) {
            this.line(`    table.primary([${pkColumns.map(c => `'${c.column_name}'`).join(', ')}]);`);
        }
    }

    private alterTableBegin(table: Table) {
        this.line(`await knex.schema.withSchema('${table.schema_name}').alterTable('${table.table_name}', function (table) {`);
    }

    private alterTableEnd() {
        this.line(`});`);
    }

    private renameColumns(table: Table, columns: [TableColumn, TableColumn][]) {
        this.alterTableBegin(table);
        columns.map(([src, dest]) =>
            this.line(`    table.renameColumn('${src.column_name}', '${dest.column_name}');`)
        );
        this.alterTableEnd();
    }

    public createTable(table: Table) {
        // Create schema and table
        this.line(`// Create table '${table.schema_name}.${table.table_name}'`);
        this.line(`await knex.schema.createSchemaIfNotExists('${table.schema_name}');`);
        this.line(`await knex.schema.withSchema('${table.schema_name}').createTable('${table.table_name}', function (table) {`);

        // Table columns
        table.columns.forEach(c => this.createColumn(c));

        // Indexes
        table.indexes.forEach(i => this.addIndex(i));

        // Primary key columns
        const primaryColumns = table.columns.filter(c => c.is_primary_key);
        if (primaryColumns.length > 0) {
            this.setPrimary(table);
        }

        this.line('});');
    }

    public dropTable(table: Table) {
        this.line(`// Drop table '${table.schema_name}.${table.table_name}'`);
        this.line(`await knex.schema.withSchema('${table.schema_name}').dropTable('${table.table_name}');`);
    }

    private _addTableColumns(table: Table, columns: TableColumn[]) {
        this.line(`// Add columns to table '${table.schema_name}.${table.table_name}'`);

        // Drop primary key
        const shouldRecreatePrimaryKey = columns.some(c => c.is_primary_key);
        if (shouldRecreatePrimaryKey) {
            this.dropPrimary(table);
        }

        // Add columns
        this.line(`await knex.schema.withSchema('${table.schema_name}').table('${table.table_name}', function (table) {`);
        columns.forEach(c => this.createColumn(c));
        this.line('});');

        // Add primary key
        if (shouldRecreatePrimaryKey) {
            this.addPrimary(table);
        }

        this.line();
    }

    public addTableColumns(tables: Table[], columns: TableColumn[]) {
        Object.values(_.groupBy(columns, c => `${c.schema_name}.${c.table_name}`))
            .forEach(arr => {
                const table = tables.find(t =>
                    t.schema_name === arr[0].schema_name &&
                    t.table_name === arr[0].table_name);
                this._addTableColumns(table, arr);
            });
    }

    private _dropTableColumns(table: Table, columns: TableColumn[]) {
        this.line(`// Drop columns from table '${table.schema_name}.${table.table_name}'`);

        // Drop primary key
        const shouldRecreatePrimaryKey = columns.some(c => c.is_primary_key);
        if (shouldRecreatePrimaryKey) {
            this.dropPrimary(table);
        }

        // Add columns
        this.line(`await knex.schema.withSchema('${table.schema_name}').table('${table.table_name}', function (table) {`);
        columns.forEach(c => this.line(`    table.dropColumn('${c.column_name}');`));
        this.line('});');

        // Add primary key
        if (shouldRecreatePrimaryKey) {
            this.addPrimary(table);
        }

        this.line();
    }

    public dropTableColumns(tables: Table[], columns: TableColumn[]) {
        Object.values(_.groupBy(columns, c => `${c.schema_name}.${c.table_name}`))
            .forEach(arr => {
                const table = tables.find(t =>
                    t.schema_name === arr[0].schema_name &&
                    t.table_name === arr[0].table_name);
                this._dropTableColumns(table, arr);
            });
    }

    private _alterTableColumns(table: Table, columns: TableColumn[]) {
        this.line(`// Alter columns of table '${table.schema_name}.${table.table_name}'`);

        // Drop primary key
        const shouldRemakePrimaryKey = columns.some(c => {
            const oldColumn = table.columns.find(cc => TableComparator.columnEquals(cc, c));
            return oldColumn.is_primary_key !== c.is_primary_key;
        });
        if (shouldRemakePrimaryKey) {
            this.dropPrimary(table);
        }

        // Rename columns if necessary
        const columnsToRename = columns
            .map<[TableColumn, TableColumn]>(dest => [table.columns.find(src => TableComparator.columnEquals(src, dest)), dest])
            .filter(([src, dest]) => src.column_name !== dest.column_name);
        if (columnsToRename.length > 0) {
            this.renameColumns(table, columnsToRename);
        }

        // Alter columns
        const columnsToAlter = columns.filter(c => {
            const oldColumn = table.columns.find(cc => TableComparator.columnEquals(cc, c));
            return !_.isEqual({
                data_type: c.data_type,
                is_nullable: c.is_nullable,
                default_value: c.default_value
            }, {
                data_type: oldColumn.data_type,
                is_nullable: oldColumn.is_nullable,
                default_value: oldColumn.default_value
            });
        });
        if (columnsToAlter.length > 0) {
            this.alterTableBegin(table);
            columns.map(c => this.alterColumn(c));
            this.alterTableEnd();
        }

        // Add primary key
        if (shouldRemakePrimaryKey) {
            this.addPrimary(table);
        }

        this.line();
    }

    public alterTableColumns(tables: Table[], columns: TableColumn[]) {
        Object.values(_.groupBy(columns, c => `${c.schema_name}.${c.table_name}`))
            .forEach(arr => {
                const table = tables.find(t =>
                    t.schema_name === arr[0].schema_name &&
                    t.table_name === arr[0].table_name);
                this._alterTableColumns(table, arr);
            });
    }

    private _addTableIndexes(table: Table, indexes: TableIndex[]) {
        this.line(`// Add indexes to table '${table.schema_name}.${table.table_name}'`);
        this.alterTableBegin(table);
        indexes.map(i => this.addIndex(i));
        this.alterTableEnd();
        this.line();
    }

    public addTableIndexes(tables: Table[], indexes: TableIndex[]) {
        Object.values(_.groupBy(indexes, i => `${i.schema_name}.${i.table_name}`))
            .forEach(arr => {
                const table = tables.find(t =>
                    t.schema_name === arr[0].schema_name &&
                    t.table_name === arr[0].table_name);
                this._addTableIndexes(table, arr);
            });
    }

    private _dropTableIndexes(table: Table, indexes: TableIndex[]) {
        this.line(`// Drop indexes from table '${table.schema_name}.${table.table_name}'`);
        this.alterTableBegin(table);
        indexes.map(i => this.dropIndex(i));
        this.alterTableEnd();
        this.line();
    }

    public dropTableIndexes(tables: Table[], indexes: TableIndex[]) {
        Object.values(_.groupBy(indexes, i => `${i.schema_name}.${i.table_name}`))
            .forEach(arr => {
                const table = tables.find(t =>
                    t.schema_name === arr[0].schema_name &&
                    t.table_name === arr[0].table_name);
                this._dropTableIndexes(table, arr);
            });
    }

    public getCode() {
        return this._code;
    }

    private static mapType(type: string, column: string) {
        if (typeMapping[type])
            return typeMapping[type](`'${column}'`);
        throw new Error(`Unsupported type mapping '${type}'!`);
    }

}