"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    success(message) {
        console.log(`${'[SUCCESS]'.bold} ${message}`.green);
    },
    warn(message) {
        console.log(`${'[WARN]'.bold} ${message}`.yellow);
    },
    error(message) {
        console.log(`${'[ERROR]'.bold} ${message}`.red);
        process.exit(0);
    }
};
