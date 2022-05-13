"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerator = void 0;
const lodash_1 = __importDefault(require("lodash"));
const table_comparator_1 = require("./table-comparator");
const typeMapping = {
    uuid: column => `uuid(${column})`,
    varchar: column => `string(${column})`,
    boolean: column => `boolean(${column})`,
    bool: column => `boolean(${column})`,
    int4: column => `integer(${column})`,
    int8: column => `integer(${column})`,
    timestamptz: column => `timestamp(${column}, { useTz: true })`,
    timestamp: column => `timestamp(${column}, { useTz: false })`
};
class CodeGenerator {
    constructor() {
        this._code = '';
    }
    line(code = '', lineEnd = '\n', lineStart = '    ') {
        this._code += `${lineStart}${code}${lineEnd}`;
    }
    generateColumn(column) {
        this.line(`    table.${CodeGenerator.mapType(column.data_type, column.column_name)}`);
        this.line(`        ${column.is_nullable ? '.nullable()' : '.notNullable()'}`, '');
        if (column.default_value)
            this.line(`        .defaultTo(knex.raw('${column.default_value}'))`, '', '\n    ');
    }
    createColumn(column) {
        this.generateColumn(column);
        this.line(';', '\n', '');
    }
    alterColumn(column) {
        this.generateColumn(column);
        this.line(`        .alter();`, '\n', '\n    ');
    }
    dropPrimary(table) {
        this.line(`await knex.schema.withSchema('${table.schema_name}').alterTable('${table.table_name}', function (table) {`);
        this.line(`    table.dropPrimary();`);
        this.line('});');
    }
    addPrimary(table) {
        this.line(`await knex.schema.withSchema('${table.schema_name}').alterTable('${table.table_name}', function (table) {`);
        this.setPrimary(table);
        this.line('});');
    }
    setPrimary(table) {
        const pkColumns = table.columns.filter(c => c.is_primary_key);
        if (pkColumns.length > 0) {
            this.line(`    table.primary([${pkColumns.map(c => `'${c.column_name}'`)}]);`);
        }
    }
    alterTableBegin(table) {
        this.line(`await knex.schema.withSchema('${table.schema_name}').alterTable('${table.table_name}', function (table) {`);
    }
    alterTableEnd() {
        this.line(`});`);
    }
    renameColumns(table, columns) {
        this.alterTableBegin(table);
        columns.map(([src, dest]) => this.line(`    table.renameColumn('${src.column_name}', '${dest.column_name}');`));
        this.alterTableEnd();
    }
    createTable(table) {
        // Create schema and table
        this.line(`// Create table '${table.schema_name}.${table.table_name}'`);
        this.line(`await knex.schema.createSchemaIfNotExists('${table.schema_name}');`);
        this.line(`await knex.schema.withSchema('${table.schema_name}').createTable('${table.table_name}', function (table) {`);
        // Table columns
        table.columns.forEach(c => this.createColumn(c));
        // Primary key columns
        const primaryColumns = table.columns.filter(c => c.is_primary_key);
        if (primaryColumns.length > 0) {
            this.setPrimary(table);
        }
        this.line('});');
    }
    dropTable(table) {
        this.line(`// Drop table '${table.schema_name}.${table.table_name}'`);
        this.line(`await knex.schema.withSchema('${table.schema_name}').dropTable('${table.table_name}');`);
    }
    _addTableColumns(table, columns) {
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
    addTableColumns(tables, columns) {
        Object.values(lodash_1.default.groupBy(columns, c => `${c.schema_name}.${c.table_name}`))
            .forEach(arr => {
            const table = tables.find(t => t.schema_name === arr[0].schema_name &&
                t.table_name === arr[0].table_name);
            this._addTableColumns(table, arr);
        });
    }
    _dropTableColumns(table, columns) {
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
    dropTableColumns(tables, columns) {
        Object.values(lodash_1.default.groupBy(columns, c => `${c.schema_name}.${c.table_name}`))
            .forEach(arr => {
            const table = tables.find(t => t.schema_name === arr[0].schema_name &&
                t.table_name === arr[0].table_name);
            this._dropTableColumns(table, arr);
        });
    }
    _alterTableColumns(table, columns) {
        this.line(`// Alter columns of table '${table.schema_name}.${table.table_name}'`);
        // Drop primary key
        const shouldRemakePrimaryKey = columns.some(c => {
            const oldColumn = table.columns.find(cc => table_comparator_1.TableComparator.columnEquals(cc, c));
            return oldColumn.is_primary_key !== c.is_primary_key;
        });
        if (shouldRemakePrimaryKey) {
            this.dropPrimary(table);
        }
        // Rename columns if necessary
        const columnsToRename = columns
            .map(dest => [table.columns.find(src => table_comparator_1.TableComparator.columnEquals(src, dest)), dest])
            .filter(([src, dest]) => src.column_name !== dest.column_name);
        if (columnsToRename.length > 0) {
            this.renameColumns(table, columnsToRename);
        }
        // Alter columns
        const columnsToAlter = columns.filter(c => {
            const oldColumn = table.columns.find(cc => table_comparator_1.TableComparator.columnEquals(cc, c));
            return !lodash_1.default.isEqual({
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
    }
    alterTableColumns(tables, columns) {
        Object.values(lodash_1.default.groupBy(columns, c => `${c.schema_name}.${c.table_name}`))
            .forEach(arr => {
            const table = tables.find(t => t.schema_name === arr[0].schema_name &&
                t.table_name === arr[0].table_name);
            this._alterTableColumns(table, arr);
        });
    }
    getCode() {
        return this._code;
    }
    static mapType(type, column) {
        if (typeMapping[type])
            return typeMapping[type](`'${column}'`);
        throw new Error(`Unsupported type mapping '${type}'!`);
    }
}
exports.CodeGenerator = CodeGenerator;
