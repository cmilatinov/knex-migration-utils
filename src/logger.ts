export default {
    success(message: string) {
        console.log(`[SUCCESS]: ${message}`.green);
    },
    warn(message: string) {
        console.log(`[WARN]: ${message}`.yellow);
    },
    error(message: string) {
        console.log(`[ERROR]: ${message}`.red);
        process.exit(0);
    }
};