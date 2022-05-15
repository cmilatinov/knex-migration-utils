"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHelp = void 0;
const command_line_usage_1 = __importDefault(require("command-line-usage"));
const cliOptions = [
    {
        name: 'filename',
        alias: 'f',
        type: String,
        typeLabel: '{underline string}',
        defaultOption: true,
        defaultValue: 'migration',
        description: 'Specifies the name of the migration file to generate. ' +
            'Note that a timestamp is automatically appended to the start of the given name. ' +
            `If the given migration name is 'migration', then the file containing the ` +
            `migration might be called '20220514170206_migration.js'.`
    },
    {
        name: 'config',
        alias: 'c',
        type: String,
        typeLabel: '{underline string}',
        defaultValue: 'config',
        description: 'Specifies the name of the configuration module to use to connect to the database.'
    },
    {
        name: 'migrations',
        alias: 'm',
        type: String,
        typeLabel: '{underline string}',
        defaultValue: 'migrations',
        description: 'Specifies the output folder for the generated migrations.'
    },
    {
        name: 'schema',
        alias: 's',
        type: String,
        typeLabel: '{underline string}',
        defaultValue: 'metadata',
        description: 'Specifies the schema in which to store the database metadata in order to compute the changes when generating a migration.'
    },
    {
        name: 'typescript',
        alias: 't',
        type: Boolean,
        typeLabel: '',
        defaultValue: false,
        description: 'Generate the resulting migration in a TypeScript file instead of JavaScript file.'
    },
    {
        name: 'reset',
        alias: 'r',
        type: Boolean,
        typeLabel: '',
        defaultValue: false,
        description: 'Reset the database metadata to the current database state. ' +
            'Attempting to generate a migration immediately after resetting the database metadata will result in no changes found.'
    },
    {
        name: 'help',
        type: Boolean,
        typeLabel: '',
        defaultValue: false,
        description: 'Display this help dialog in the console.'
    }
];
const cliSections = [
    {
        header: 'Knex Generate Migration (kgm)',
        content: [
            'Automatically generate a knex migration file based on the changes made to the database since the last generation.',
            '',
            'Usage: `kgm [migration_name] [options ...]`'
        ]
    },
    {
        header: 'Examples',
        content: [
            {
                desc: `Generate a migration called 'drop_table'.`,
                example: '$ kgm drop_table'
            },
            {},
            {
                desc: `Reset the migration state to the current state of the database.`,
                example: '$ kgm -r'
            },
            {},
            {
                desc: `Generate a migration called 'create_table' in typescript, using 'meta_schema' ` +
                    `as the metadata schema and 'subfolder/my_config_file' as the config module.`,
                example: '$ kgm create_table -t -s meta_schema -c subfolder/my_config_file'
            },
            {},
            {
                desc: `Generate a migration called 'drop_index', in the 'my_migrations' folder.`,
                example: '$ kgm drop_index -m my_migrations'
            }
        ]
    },
    {
        header: 'Options',
        optionList: cliOptions
    }
];
function printHelp() {
    const usage = (0, command_line_usage_1.default)(cliSections);
    console.log(usage);
}
exports.printHelp = printHelp;
exports.default = cliOptions;
