export default () => ({
    schemas: [
        'test',
        'another'
    ],
    database: {
        client: 'pg',
        version: '14.2',
        connection: {
            host: 'localhost',
            user: 'user',
            password: 'password',
            port: 5432,
            database: 'postgres',
            ssl: false
        }
    }
});