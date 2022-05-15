import commandLineUsage, { Section, OptionDefinition } from 'command-line-usage';
import { ArgsBase } from '../common/utils/load-config';

export const cliOptions: OptionDefinition[] = [
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

const cliSections: Section[] = [
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
        optionList: cliOptions
    }
];

export interface ArgsKGT extends ArgsBase {
    filename: string;
}

export function printHelp() {
    const usage = commandLineUsage(cliSections);
    console.log(usage);
}

export default cliOptions;