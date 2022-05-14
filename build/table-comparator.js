"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableComparator = void 0;
const knex_1 = __importDefault(require("knex"));
const lodash_1 = __importDefault(require("lodash"));
class TableComparator {
    constructor(args, config) {
        this.args = args;
        this.config = config;
        this.db = (0, knex_1.default)(config.database);
    }
    getDB() {
        return this.db;
    }
    async build() {
        await this.getColumnLists();
        this.computeDifferences();
    }
    async getColumnLists() {
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
            is_primary_key: !!constraintColumns.find(cons => cons.table_schema === c.table_schema &&
                cons.table_name === c.table_name &&
                cons.column_name === c.column_name)
        }));
        // Query old table information
        this.oldColumnList = await this.db(`${this.args.schema}.table_columns`);
    }
    computeDifferences() {
        const tableList = lodash_1.default.uniq(this.columnList.map(c => `${c.schema_name}.${c.table_name}`));
        const oldTableList = lodash_1.default.uniq(this.oldColumnList.map(c => `${c.schema_name}.${c.table_name}`));
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
        };
        this.tableList = tableList.map(mapTable);
        this.oldTableList = oldTableList.map(mapOldTable);
        const tableListToCreate = lodash_1.default.difference(tableList, oldTableList);
        this.tablesToCreate = tableListToCreate.map(mapTable);
        const tableListToDrop = lodash_1.default.difference(oldTableList, tableList);
        this.tablesToDrop = tableListToDrop.map(mapOldTable);
        this.columnsToAlter = lodash_1.default.differenceWith(lodash_1.default.intersectionWith(this.columnList, this.oldColumnList, TableComparator.columnEquals), lodash_1.default.intersectionWith(this.oldColumnList, this.columnList, TableComparator.columnEquals), lodash_1.default.isEqual).map(dest => [this.oldColumnList.find(src => TableComparator.columnEquals(dest, src)), dest]);
        this.columnsToAdd = lodash_1.default.differenceWith(this.columnList, this.oldColumnList, lodash_1.default.isEqual)
            .filter(c => !tableListToCreate.includes(`${c.schema_name}.${c.table_name}`) &&
            !this.columnsToAlter.find(([_, dest]) => TableComparator.columnEquals(c, dest)));
        this.columnsToDrop = lodash_1.default.differenceWith(this.oldColumnList, this.columnList, lodash_1.default.isEqual)
            .filter(c => !tableListToDrop.includes(`${c.schema_name}.${c.table_name}`) &&
            !this.columnsToAlter.find(([_, dest]) => TableComparator.columnEquals(c, dest)));
    }
    hasDifferences() {
        return [
            this.tablesToCreate,
            this.tablesToDrop,
            this.columnsToAlter,
            this.columnsToAdd,
            this.columnsToDrop
        ].some(arr => arr.length > 0);
    }
    getDifferencesInfo() {
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
        };
    }
    getColumns() {
        return this.columnList;
    }
    static columnEquals(a, b) {
        return lodash_1.default.isEqual({
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
exports.TableComparator = TableComparator;
