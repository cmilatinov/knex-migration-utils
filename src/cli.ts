import { OptionDefinition } from 'command-line-args';

const cliOptions: OptionDefinition[] = [
    { name: 'file', type: String, defaultOption: true, defaultValue: 'migration' },
    { name: 'config', alias: 'c', type: String, defaultValue: 'config' },
    { name: 'migrations', alias: 'm', type: String, defaultValue: 'migrations' },
    { name: 'schema', alias: 's', type: String, defaultValue: 'meta' },
    { name: 'typescript', alias: 't', type: Boolean, defaultValue: false },
    { name: 'reset', alias: 'r', type: Boolean, defaultValue: false }
];

export interface ArgsObject {
    file: string;
    config: string;
    migrations: string;
    typescript: boolean;
    schema: string;
}

export default cliOptions;