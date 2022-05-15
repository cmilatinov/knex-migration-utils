# Knex Migration Utils

| Tool    | Description                                                                                                                                                |
|---------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **kgm** | Automatically generate migrations for your database based on the differences between its current state and its state during the last migration generation. |
| **kgt** | Automatically generate database types for use with the [typed-knex](https://github.com/wwwouter/typed-knex) package.                                       |

## kgm &mdash; Knex Generate Migration

Automatically generate a knex migration file based on the changes made to the database since the last generation.

This tool currently only supports the `PostgreSQL` dialect.

### Usage 

`$ kgm [migration_name] [options ...]`

### Examples

Generate a migration called `drop_table`:

`$ kgm drop_table`

Reset the migration state to the current state of the database:

`$ kgm -r`

Generate a migration called `create_table` in typescript, using `meta_schema` as the metadata schema and `subfolder/my_config_file` as the config module:

`$ kgm create_table -t -s meta_schema -c subfolder/my_config_file`

Generate a migration called `drop_index`, in the `my_migrations` folder:

`$ kgm drop_index -m my_migrations`

### Options

**-f**, **--filename** <u>string</u>     

Specifies the name of the migration file to generate. 
Note that a timestamp is automatically appended to the start of the given name. 
If the given migration name is `migration`, 
then the file containing the migration might be called `20220514170206_migration.js`.

**-c**, **--config** <u>string</u>

Specifies the name of the configuration module to use to connect to the database.

**-m**, **--migrations** <u>string</u>   

Specifies the output folder for the generated migrations.                     

**-s**, **--schema** <u>string</u>

Specifies the schema in which to store the database metadata in order to compute the changes when generating a migration.                              

**-t**, **--typescript**

Generate the resulting migration in a TypeScript file instead of JavaScript file.

**-r**, **--reset**

Reset the database metadata to the current database state. 
Attempting to generate a migration immediately after resetting the database metadata will result in no changes found.                                                   

**--help**

Display the help dialog in the console.

## kgt &mdash; Knex Generate Types

Automatically generate a list of types corresponding to the tables in your database. 
This tool is meant to be used in conjunction with the typed-knex package.

This tool currently only supports the `PostgreSQL` dialect.

### Usage

`$ kgt [file_name] [options ...]`

### Examples

Generate database types in the `src/types/database.ts` file:

`$ kgt src/types/database.ts`

Generate database types in the `types.ts` file, using `subfolder/my_config_file` as the config module:

`$ kgt types.ts -c subfolder/my_config_file`

### Options

**-f**, **--filename** <u>string</u>

Specifies the name of the types file to generate (including the extension).   

**-c**, **--config** <u>string</u>

Specifies the name of the configuration module to use to connect to the database.

**--help**

Display the help dialog in the console.