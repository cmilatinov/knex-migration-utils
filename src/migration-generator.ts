import * as fs from 'fs';

import { CodeGenerator } from './code-generator';
import { TableComparator } from './table-comparator';
import { Config } from './interfaces/config';
import { CODE_TEMPLATE_TS, CODE_TEMPLATE_JS } from './templates';
import { ArgsObject } from './cli';

export class MigrationGenerator {

    private readonly _comparator: TableComparator;
    private readonly _migrationUp: CodeGenerator;
    private readonly _migrationDown: CodeGenerator;

    constructor(args: ArgsObject, config: Config) {
        this._comparator = new TableComparator(args, config);
        this._migrationUp = new CodeGenerator();
        this._migrationDown = new CodeGenerator();
    }

    public getComparator(): TableComparator {
        return this._comparator;
    }

    public async build() {
        await this._comparator.build();

        const {
            tableList,
            oldTableList,
            tablesToCreate,
            tablesToDrop,
            columnsToAdd,
            columnsToDrop,
            columnsToAlter
        } = this._comparator.getDifferencesInfo();

        this._migrationUp.line();
        this._migrationDown.line();

        tablesToCreate.forEach(t => this._migrationUp.createTable(t));
        tablesToCreate.forEach(t => this._migrationDown.dropTable(t));

        tablesToDrop.forEach(t => this._migrationUp.dropTable(t));
        tablesToDrop.forEach(t => this._migrationDown.createTable(t));

        this._migrationUp.addTableColumns(tableList, columnsToAdd);
        this._migrationDown.dropTableColumns(oldTableList, columnsToAdd);

        this._migrationUp.dropTableColumns(tableList, columnsToDrop);
        this._migrationDown.addTableColumns(oldTableList, columnsToDrop);

        this._migrationUp.alterTableColumns(oldTableList, columnsToAlter.map(([_, dest]) => dest));
        this._migrationDown.alterTableColumns(tableList, columnsToAlter.map(([src, _]) => src));
    }

    public generate(file: string, useTypescript: boolean = false) {
        let code = useTypescript ? CODE_TEMPLATE_TS : CODE_TEMPLATE_JS;
        code = code.replace('{{MIGRATION_UP}}', this._migrationUp.getCode());
        code = code.replace('{{MIGRATION_DOWN}}', this._migrationDown.getCode());
        fs.writeFileSync(file, code);
    }

}