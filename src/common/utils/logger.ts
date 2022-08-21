export default {
    success(message: string) {
        console.log(`${'[SUCCESS]'.bold} ${message}`.green);
    },
    warn(message: string) {
        console.log(`${'[WARN]'.bold} ${message}`.yellow);
    },
    error(message: string) {
        console.log(`${'[ERROR]'.bold} ${message}`.red);
        process.exit(0);
    }
};