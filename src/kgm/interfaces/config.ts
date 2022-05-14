import { Knex } from 'knex';

export interface Config {
    schemas: string[];
    database: Knex.Config;
}