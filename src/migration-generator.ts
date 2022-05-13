import * as fs from 'fs';

import { CodeGenerator } from './code-generator';
import { TableComparator } from './table-comparator';
import { Config } from './interfaces/config';
import { CODE_TEMPLATE_TS, CODE_TEMPLATE_JS } from './templates';

export class MigrationGenerator {

    private readonly _comparator: TableComparator;
    private readonly _migrationUp: CodeGenerator;
    private readonly _migrationDown: CodeGenerator;

    constructor(config: Config) {
        this._comparator = new TableComparator(config);
        this._migrationUp = new CodeGenerator();
        this._migrationDown = new CodeGenerator();
    }

    public getComparator() {
        return this._comparator;
    }

    public async build() {
        await this._comparator.build();

        const tables = this._comparator.getTables();
        const oldTables = this._comparator.getOldTables();

        this._migrationUp.line();
        this._migrationDown.line();

        const tablesToCreate = this._comparator.getTablesToCreate();
        tablesToCreate.forEach(t => this._migrationUp.createTable(t));
        tablesToCreate.forEach(t => this._migrationDown.dropTable(t));

        const tablesToDrop = this._comparator.getTablesToDrop();
        tablesToDrop.forEach(t => this._migrationUp.dropTable(t));
        tablesToDrop.forEach(t => this._migrationDown.createTable(t));

        const columnsToAdd = this._comparator.getColumnsToAdd();
        this._migrationUp.addTableColumns(tables, columnsToAdd);
        this._migrationDown.dropTableColumns(oldTables, columnsToAdd);

        const columnsToDrop = this._comparator.getColumnsToDrop();
        this._migrationUp.dropTableColumns(tables, columnsToDrop);
        this._migrationDown.addTableColumns(oldTables, columnsToDrop);

        const columnsToAlter = this._comparator.getColumnsToAlter();
        this._migrationUp.alterTableColumns(oldTables, columnsToAlter.map(([_, dest]) => dest));
        this._migrationDown.alterTableColumns(tables, columnsToAlter.map(([src, _]) => src));
    }

    public generate(file: string, useTypescript: boolean = false) {
        let code = useTypescript ? CODE_TEMPLATE_TS : CODE_TEMPLATE_JS;
        code = code.replace('{{MIGRATION_UP}}', this._migrationUp.getCode());
        code = code.replace('{{MIGRATION_DOWN}}', this._migrationDown.getCode());
        fs.writeFileSync(file, code);
    }

}