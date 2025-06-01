if (process.env.VITE_APP_VERSION === undefined) {
  const now = new Date();
  process.env.VITE_APP_VERSION = `${now.getUTCFullYear() - 2000}.${
    now.getUTCMonth() + 1
  }.${now.getUTCDate()}-${now.getUTCHours() * 60 + now.getUTCMinutes()}`;
}

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  productName: 'MRut server',
  icon: '../logo.png',
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    runAfterFinish: false
  },
  win: {
    target: 'nsis'
  },
  linux: {
    target: 'flatpak'
  },
  files: ['packages/**/dist/**'],
  extraMetadata: {
    version: process.env.VITE_APP_VERSION,
  },
};

module.exports = config;
