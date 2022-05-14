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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationGenerator = void 0;
const fs = __importStar(require("fs"));
const code_generator_1 = require("./code-generator");
const table_comparator_1 = require("./table-comparator");
const templates_1 = require("./templates");
class MigrationGenerator {
    constructor(args, config) {
        this._comparator = new table_comparator_1.TableComparator(args, config);
        this._migrationUp = new code_generator_1.CodeGenerator();
        this._migrationDown = new code_generator_1.CodeGenerator();
    }
    getComparator() {
        return this._comparator;
    }
    async build() {
        await this._comparator.build();
        const { tableList, oldTableList, tablesToCreate, tablesToDrop, columnsToAdd, columnsToDrop, columnsToAlter } = this._comparator.getDifferencesInfo();
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
    generate(file, useTypescript = false) {
        let code = useTypescript ? templates_1.CODE_TEMPLATE_TS : templates_1.CODE_TEMPLATE_JS;
        code = code.replace('{{MIGRATION_UP}}', this._migrationUp.getCode());
        code = code.replace('{{MIGRATION_DOWN}}', this._migrationDown.getCode());
        fs.writeFileSync(file, code);
    }
}
exports.MigrationGenerator = MigrationGenerator;
