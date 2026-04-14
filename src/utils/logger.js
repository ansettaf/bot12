const log = (message, ...args) => {
    console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...args);
};

const error = (message, ...args) => {
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args);
};

const warn = (message, ...args) => {
    console.warn(`[${new Date().toISOString()}] [WARN]  ${message}`, ...args);
};

module.exports = {
    log,
    error,
    warn
};
