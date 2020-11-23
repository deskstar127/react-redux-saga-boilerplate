const fs = require('fs');
const path = require('path');
const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const publicUrlOrPath = getPublicUrlOrPath(
  process.env.NODE_ENV === 'development',
  require(resolveApp('package.json')).homepage,
  process.env.PUBLIC_URL,
);

const moduleFileExtensions = ['js', 'jsx', 'json', 'mjs', 'ts', 'tsx'];

const resolveModule = (resolveFn, filePath) => {
  const extension = moduleFileExtensions.find(ext =>
    fs.existsSync(resolveFn(`${filePath}.${ext}`)),
  );

  if (extension) {
    return resolveFn(`${filePath}.${extension}`);
  }

  return resolveFn(`${filePath}.js`);
};

module.exports = {
  appPath: resolveApp('.'),
  appAssets: resolveApp('assets'),
  appBuild: resolveApp('build'),
  appHtml: resolveApp('assets/index.html'),
  appIndex: resolveModule(resolveApp, 'src/index'),
  appPolyfills: resolveApp('src/polyfills'),
  appSrc: resolveApp('src'),
  appTsConfig: resolveApp('tsconfig.json'),
  config: resolveApp('config'),
  dotenv: resolveApp('.env'),
  nodeModules: resolveApp('node_modules'),
  packageJson: resolveApp('package.json'),
  publicUrlOrPath,
  swSrc: resolveModule(resolveApp, 'src/service-worker'),
  test: resolveApp('test'),
  moduleFileExtensions,
};
