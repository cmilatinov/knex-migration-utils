"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printHelp = exports.cliOptions = void 0;
const command_line_usage_1 = __importDefault(require("command-line-usage"));
exports.cliOptions = [
    {
        name: 'filename',
        alias: 'f',
        type: String,
        typeLabel: '{underline string}',
        defaultOption: true,
        defaultValue: 'src/types/database.ts',
        description: 'Specifies the name of the types file to generate (including the extension).'
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
        name: 'help',
        type: Boolean,
        typeLabel: '',
        defaultValue: false,
        description: 'Display this help dialog in the console.'
    }
];
const cliSections = [
    {
        header: 'Knex Generate Types (kgt)',
        content: [
            'Automatically generate a list of types corresponding to the tables in your database. ' +
                'This tool is meant to be used in conjunction with the typed-knex package.',
            '',
            'Usage: `kgt [file_name] [options ...]`'
        ]
    },
    {
        header: 'Examples',
        content: [
            {
                desc: `Generate database types in the 'src/types/database.ts' file.`,
                example: '$ kgt src/types/database.ts'
            },
            {},
            {
                desc: `Generate database types in the 'types.ts' file, using 'subfolder/my_config_file' as the config module.`,
                example: '$ kgm types.ts -c subfolder/my_config_file'
            },
        ]
    },
    {
        header: 'Options',
        optionList: exports.cliOptions
    }
];
function printHelp() {
    const usage = (0, command_line_usage_1.default)(cliSections);
    console.log(usage);
}
exports.printHelp = printHelp;
exports.default = exports.cliOptions;
