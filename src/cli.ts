import { OptionDefinition } from 'command-line-args';

const cliOptions: OptionDefinition[] = [
    { name: 'file', type: String, defaultOption: true },
    { name: 'config', alias: 'c', type: String, defaultValue: 'config' },
    { name: 'migrations', alias: 'm', type: String, defaultValue: 'migrations' },
    { name: 'typescript', alias: 't', type: Boolean, defaultValue: false }
];

export default cliOptions;