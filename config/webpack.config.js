/*eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const resolve = require('resolve');
const { format } = require('date-fns');

const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const ForkTsCheckerWebpackPlugin = require('react-dev-utils/ForkTsCheckerWebpackPlugin');
const GitRevPlugin = require('git-rev-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const InlineChunkHtmlPlugin = require('react-dev-utils/InlineChunkHtmlPlugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const ManifestPlugin = require('webpack-manifest-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin');
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const PnpWebpackPlugin = require('pnp-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

const postcssNormalize = require('postcss-normalize');
const safePostCssParser = require('postcss-safe-parser');
const typescriptFormatter = require('react-dev-utils/typescriptFormatter');

const getClientEnvironment = require('./env');
const paths = require('./paths');

const NPMPackage = require(paths.packageJson);
const gitRevPlugin = new GitRevPlugin();

const GITHASH = gitRevPlugin.hash() || '';

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
// Some apps do not need the benefits of saving a web request, so not inlining the chunk
// makes for a smoother build process.
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';

module.exports = webpackEnv => {
  const isProd = webpackEnv === 'production';
  const isDev = webpackEnv === 'development';

  // `publicUrl` is just like `publicPath`, but we will provide it to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_PATH%/xyz looks better than %PUBLIC_PATH%xyz.
  // Get environment variables to inject into our app.
  const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));

  const optimizeCSSOptions = {
    // `inline: false` forces the sourcemap to be output into a
    // separate file
    inline: false,
    // `annotation: true` appends the sourceMappingURL to the end of
    // the css file, helping the browser find the sourcemap
    annotation: true,
  };
  const htmlPluginOptions = {
    githash: GITHASH,
    inject: true,
    template: paths.appHtml,
    title: NPMPackage.title,
  };

  if (isProd) {
    htmlPluginOptions.minify = {
      collapseWhitespace: true,
      keepClosingSlash: true,
      minifyCSS: true,
      minifyJS: true,
      minifyURLs: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
    };
  }

  const cssLoaders = [
    isDev && require.resolve('style-loader'),
    isProd && {
      loader: MiniCssExtractPlugin.loader,
      options: paths.publicUrlOrPath.startsWith('.') ? { publicPath: '../../' } : {},
    },
    {
      loader: require.resolve('css-loader'),
      options: {
        sourceMap: isProd,
      },
    },
    {
      loader: require.resolve('postcss-loader'),
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebook/create-react-app/issues/2677
        ident: 'postcss',
        plugins: [
          require('postcss-flexbugs-fixes'),
          require('postcss-preset-env')({
            autoprefixer: {
              flexbox: 'no-2009',
            },
            stage: 3,
          }),
          postcssNormalize(),
        ],
        sourceMap: isProd && shouldUseSourceMap,
      },
    },
  ].filter(Boolean);

  const sassLoaders = [
    ...cssLoaders,
    {
      loader: 'sass-loader',
      options: {
        sourceMap: isProd,
      },
    },
  ];

  return {
    bail: isProd,
    context: paths.appSrc,
    mode: webpackEnv,
    devtool: isProd && shouldUseSourceMap ? 'source-map' : 'cheap-module-source-map',
    entry: [
      isProd && paths.appPolyfills,
      isDev && 'react-dev-utils/webpackHotDevClient',
      isDev && 'react-error-overlay',
      paths.appIndex,
    ].filter(Boolean),
    output: {
      chunkFilename: isProd ? 'static/js/[name].[git-hash].chunk.js' : 'static/js/[name].chunk.js',
      filename: isProd ? 'static/js/[name].[git-hash].js' : 'static/js/bundle.js',
      path: isProd ? paths.appBuild : undefined,
      pathinfo: isDev,
      publicPath: paths.publicUrlOrPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isProd
        ? info => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
        : info => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/'),
    },
    resolve: {
      alias: {
        assets: paths.appAssets,
        test: paths.test,
        'react-dom': '@hot-loader/react-dom',
      },
      modules: [paths.appSrc, paths.nodeModules],
      extensions: paths.moduleFileExtensions.map(d => `.${d}`),
      plugins: [
        // Adds support for installing with Plug'n'Play, leading to faster installs and adding
        // guards against forgotten dependencies and such.
        PnpWebpackPlugin,
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(paths.appSrc, [paths.appAssets, paths.packageJson]),
      ],
    },
    resolveLoader: {
      plugins: [
        // Also related to Plug'n'Play, but this time it tells Webpack to load its loaders
        // from the current package.
        PnpWebpackPlugin.moduleLoader(module),
      ],
    },
    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.(jsx?|mjs|tsx?)$/,
              loader: require.resolve('babel-loader'),
              options: {
                cacheDirectory: false,
              },
              include: paths.appSrc,
            },
            // { test: /\.tsx?$/, loader: 'ts-loader' },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: /\.css$/,
              use: cssLoaders,
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: /\.(scss|sass)$/,
              use: sassLoaders,
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
              use: [
                {
                  loader: 'file-loader',
                  query: { name: 'static/[name].[ext]' },
                },
                {
                  loader: 'image-webpack-loader',
                  query: {
                    optipng: {
                      optimizationLevel: 5,
                    },
                    pngquant: {
                      quality: [0.75, 0.9],
                    },
                  },
                },
              ],
            },
            {
              test: /\.svg$/,
              use: [
                {
                  loader: '@svgr/webpack',
                  options: {
                    icon: true,
                    typescript: true,
                  },
                },
                {
                  loader: 'file-loader',
                  options: {
                    name: 'static/[name].[git-hash].[ext]',
                  },
                },
              ],
            },
            {
              test: /\.md$/,
              use: ['html-loader', 'markdown-loader'],
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              loader: 'file-loader',
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/\.(js|jsx|mjs|ts|tsx)$/, /\.html$/, /\.json$/],
              options: {
                name: 'static/[name].[git-hash].[ext]',
              },
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ],
        },
      ],
    },
    optimization: {
      minimize: isProd,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            parse: {
              // we want uglify-js to parse ecma 8 code. However, we don't want it
              // to apply any minfication steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending futher investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {
              safari10: true,
              keep_fnames: true,
            },
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
          // Use multi-process parallel running to improve the build speed
          // Default number of concurrent runs: os.cpus().length - 1
          parallel: true,
          // Enable file caching
          cache: true,
          sourceMap: shouldUseSourceMap,
        }),
        new OptimizeCSSAssetsPlugin({
          cssProcessorOptions: {
            parser: safePostCssParser,
            map: shouldUseSourceMap ? optimizeCSSOptions : false,
          },
        }),
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        ...env.stringified,
        APP__BRANCH: JSON.stringify(gitRevPlugin.branch()),
        APP__BUILD_DATE: JSON.stringify(format(new Date(), 'dd/MM/yyyy')),
        APP__GITHASH: JSON.stringify(gitRevPlugin.hash()),
        APP__VERSION: JSON.stringify(NPMPackage.version),
      }),
      new ModuleNotFoundPlugin(paths.appPath),
      gitRevPlugin,
      new HtmlPlugin(htmlPluginOptions),
      new InterpolateHtmlPlugin(HtmlPlugin, env.raw),
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath),
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
      isProd &&
        shouldInlineRuntimeChunk &&
        new InlineChunkHtmlPlugin(HtmlPlugin, [/runtime~.+[.]js/]),
      isProd &&
        new MiniCssExtractPlugin({
          filename: 'css/bundle.[git-hash].css',
          chunkFilename: 'css/bundle.[git-hash].chunk.css',
        }),
      // Generate an asset manifest file with the following content:
      // - "files" key: Mapping of all asset filenames to their corresponding
      //   output file so that tools can pick it up without having to parse
      //   `index.html`
      // - "entrypoints" key: Array of files which are included in `index.html`,
      //   can be used to reconstruct the HTML if necessary
      new ManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: paths.publicUrlOrPath,
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);
          const entrypointFiles = entrypoints.main.filter(fileName => !fileName.endsWith('.map'));

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
      }),
      isProd &&
        fs.existsSync(paths.swSrc) &&
        new WorkboxWebpackPlugin.InjectManifest({
          swSrc: paths.swSrc,
          dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
          exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
          // Bump up the default maximum size (2mb) that's precached,
          // to make lazy-loading failure scenarios less likely.
          // See https://github.com/cra-template/pwa/issues/13#issuecomment-722667270
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        }),
      new ForkTsCheckerWebpackPlugin({
        typescript: resolve.sync('typescript', {
          basedir: paths.nodeModules,
        }),
        async: isDev,
        useTypescriptIncrementalApi: true,
        checkSyntacticErrors: true,
        resolveModuleNameModule: process.versions.pnp ? `${__dirname}/pnpTs.js` : undefined,
        resolveTypeReferenceDirectiveModule: process.versions.pnp
          ? `${__dirname}/pnpTs.js`
          : undefined,
        tsconfig: paths.appTsConfig,
        reportFiles: [
          '**',
          '!**/__tests__/**',
          '!**/?(*.)(spec|test).*',
          '!**/src/setupProxy.*',
          '!**/src/setupTests.*',
        ],
        silent: true,
        // The formatter is invoked directly in WebpackDevServerUtils during development
        formatter: isProd ? typescriptFormatter : undefined,
      }),
      isDev &&
        new CircularDependencyPlugin({
          exclude: /node_modules/,
          failOnError: true,
          cwd: process.cwd(),
        }),
      // Add module names to factory functions so they appear in browser profiler.
      isDev && new webpack.NamedModulesPlugin(),
      // This is necessary to emit hot updates (currently CSS only):
      isDev && new webpack.HotModuleReplacementPlugin(),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebookincubator/create-react-app/issues/240
      isDev && new CaseSensitivePathsPlugin(),
      // If you require a missing module and then `npm install` it, you still have
      // to restart the development server for Webpack to discover it. This plugin
      // makes the discovery automatic so you don't have to restart.
      // See https://github.com/facebookincubator/create-react-app/issues/186
      isDev && new WatchMissingNodeModulesPlugin(paths.nodeModules),
    ].filter(Boolean),
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      module: 'empty',
      dgram: 'empty',
      dns: 'mock',
      fs: 'empty',
      http2: 'empty',
      net: 'empty',
      tls: 'empty',
      child_process: 'empty',
    },
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
  };
};
