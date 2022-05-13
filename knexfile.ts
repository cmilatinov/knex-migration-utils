import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
    development: {
        client: 'pg',
        version: '14.2',
        connection: {
            host: 'localhost',
            user: 'user',
            password: 'password',
            port: 5432,
            database: 'postgres',
            ssl: false
        },
        migrations: {
            tableName: 'knex_migrations'
        }
    },

    staging: {
        client: 'pg',
        version: '14.2',
        connection: {
            host: 'localhost',
            user: 'user',
            password: 'password',
            port: 5432,
            database: 'postgres',
            ssl: false
        },
        migrations: {
            tableName: 'knex_migrations'
        }
    },

    production: {
        client: 'pg',
        version: '14.2',
        connection: {
            host: 'localhost',
            user: 'user',
            password: 'password',
            port: 5432,
            database: 'postgres',
            ssl: false
        },
        migrations: {
            tableName: 'knex_migrations'
        }
    }
};

module.exports = config;
