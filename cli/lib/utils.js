const path = require('path');
const fs = require('fs');
const loadJSON = require('load-json-file');
const writeJSON = require('write-json-file');
const ApifyClient = require('apify-client');
const { error } = require('./outputs');
const { APIFY_LOCAL_EMULATION_DIR, APIFY_DEFAULT_DATASET_ID,
    APIFY_DEFAULT_KEY_VALUE_STORE_ID, GLOBAL_CONFIGS_FOLDER,
    AUTH_FILE_PATH, LOCAL_CONFIG_NAME, APIFY_LOCAL_DATASETS_DIR,
    APIFY_LOCAL_KEY_VALUE_STORES_DIR } = require('./consts');
const { createFolderSync, updateLocalJSON } = require('./files');

const getLoggedClientOrError = async () => {
    if (!fs.existsSync(GLOBAL_CONFIGS_FOLDER) || !fs.existsSync(AUTH_FILE_PATH)) {
        error('You aren\'t logged call "apify login" to process login.');
        return;
    }
    const auth = loadJSON.sync(AUTH_FILE_PATH);
    const loggedClient = await getLoggedClient(auth);
    if (!loggedClient) {
        error('You aren\'t logged call "apify login" to process login.');
        return;
    }
    return loggedClient;
};

const getLoggedClient = async (auth) => {
    try {
        const apifiClient = new ApifyClient(auth);
        await apifiClient.crawlers.listCrawlers();
        return apifiClient;
    } catch (e) {
        return false;
    }
};

const getLocalConfig = async () => {
    const localConfigPath = path.join(process.cwd(), LOCAL_CONFIG_NAME);
    if (!fs.existsSync(localConfigPath)) {
        error('apify.json is missing in current dir! Call "apify init" to create it.');
        return;
    }
    return loadJSON.sync(localConfigPath);
};

const setLocalConfig = async (localConfig, actDir) => {
    actDir = actDir || process.cwd();
    writeJSON.sync(path.join(actDir, LOCAL_CONFIG_NAME), localConfig);
};

const setLocalEnv = async (actDir) => {
    // Create folders for emulation Apify stores
    const localDir = createFolderSync(path.join(actDir, APIFY_LOCAL_EMULATION_DIR));
    const datasetsDir = createFolderSync(path.join(localDir, APIFY_LOCAL_DATASETS_DIR));
    const keyValueStoresDir = createFolderSync(path.join(localDir, APIFY_LOCAL_KEY_VALUE_STORES_DIR));
    createFolderSync(path.join(datasetsDir, APIFY_DEFAULT_DATASET_ID));
    createFolderSync(path.join(keyValueStoresDir, APIFY_DEFAULT_KEY_VALUE_STORE_ID));

    // Update gitignore
    const gitingore = path.join(actDir, '.gitignore');
    if (fs.existsSync(gitingore)) {
        fs.writeFileSync(gitingore, APIFY_LOCAL_EMULATION_DIR, { flag: 'a' });
    }

    // Update package.json
    const packageJson = path.join(actDir, 'package.json');
    if (fs.existsSync(packageJson)) {
        await updateLocalJSON(packageJson, {
                'run-local': `APIFY_LOCAL_EMULATION_DIR=./${APIFY_LOCAL_EMULATION_DIR} APIFY_DEFAULT_KEY_VALUE_STORE_ID=${APIFY_DEFAULT_KEY_VALUE_STORE_ID} APIFY_DEFAULT_DATASET_ID=${APIFY_DEFAULT_DATASET_ID} node main.js`,
            }, 'scripts');
    }
};

const argsToCamelCase = (args) => {
    const camelCasedArgs = {};
    Object.keys(args).forEach((arg) => {
        const camelCasedArg = arg.replace(/-(.)/g, $1 => $1.toUpperCase()).replace(/-/g, '');;
        if (arg !== '_')  camelCasedArgs[camelCasedArg] = args[arg];
    });
    return camelCasedArgs;
};

module.exports = {
    getLoggedClientOrError,
    getLocalConfig,
    setLocalConfig,
    setLocalEnv,
    argsToCamelCase,
    getLoggedClient,
};
