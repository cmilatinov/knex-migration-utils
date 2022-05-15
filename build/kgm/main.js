"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const luxon_1 = require("luxon");
require("colors");
const cli_1 = __importStar(require("./cli"));
const migration_generator_1 = require("./classes/migration-generator");
const load_config_1 = require("../common/utils/load-config");
const logger_1 = __importDefault(require("../common/utils/logger"));
async function main() {
    try {
        // Command line args
        const { args, config } = await (0, load_config_1.loadArgsAndConfig)(cli_1.default, cli_1.printHelp);
        // Create generator
        const generator = new migration_generator_1.MigrationGenerator(args, config);
        const comparator = generator.getComparator();
        const db = comparator.getDB();
        // Compute current and old table lists
        await generator.build();
        // Create migrations directory
        fs.mkdirSync(args.migrations, { recursive: true });
        // Generate migration code
        if (!args.reset) {
            if (comparator.hasDifferences()) {
                const timestamp = luxon_1.DateTime.now().toFormat('yyyyMMddHHmmss');
                const migrationFile = `${args.migrations}/${timestamp}_${args.filename}${args.typescript ? '.ts' : '.js'}`;
                generator.generate(migrationFile, args.typescript);
                logger_1.default.success(`Generated migration '${migrationFile}'.`);
            }
            else {
                logger_1.default.warn(`No differences were detected since the last migration. No new migration was generated.`);
            }
        }
        else {
            logger_1.default.warn(`Resetting database metadata. No migration will be generated.`);
        }
        // Update metadata
        await comparator.updateMetadata();
        // Close database connection (in order to stop process)
        await db.destroy();
    }
    catch (err) {
        logger_1.default.error(`${err.message}.`);
    }
}
main().then();
