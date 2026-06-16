const { getDefaultConfig } = require("@expo/metro-config");
const defaultConfig = getDefaultConfig(__dirname, { isTSClient: true });

module.exports = defaultConfig;
