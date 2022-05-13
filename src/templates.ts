export const CODE_TEMPLATE_JS =
`exports.up = async function (knex) {
{{MIGRATION_UP}}
};

exports.down = async function (knex) {
{{MIGRATION_DOWN}}
};
`;

export const CODE_TEMPLATE_TS =
`import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
{{MIGRATION_UP}}
}

export async function down(knex: Knex): Promise<void> {
{{MIGRATION_DOWN}}
}
`;