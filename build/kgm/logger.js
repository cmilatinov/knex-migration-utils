"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    success(message) {
        console.log(`[SUCCESS]: ${message}`.green);
    },
    warn(message) {
        console.log(`[WARN]: ${message}`.yellow);
    },
    error(message) {
        console.log(`[ERROR]: ${message}`.red);
        process.exit(0);
    }
};
