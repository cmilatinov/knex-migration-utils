"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODE_TEMPLATE_TS = exports.CODE_TEMPLATE_JS = void 0;
exports.CODE_TEMPLATE_JS = `exports.up = async function (knex) {
{{MIGRATION_UP}}
};

exports.down = async function (knex) {
{{MIGRATION_DOWN}}
};
`;
exports.CODE_TEMPLATE_TS = `import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
{{MIGRATION_UP}}
}

export async function down(knex: Knex): Promise<void> {
{{MIGRATION_DOWN}}
}
`;
