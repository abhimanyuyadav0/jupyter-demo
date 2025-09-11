const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add fallbacks for Node.js core modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "buffer": require.resolve("buffer"),
        "stream": require.resolve("stream-browserify"),
        "process": require.resolve("process/browser"),
        "crypto": require.resolve("crypto-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "path": require.resolve("path-browserify"),
        "util": require.resolve("util"),
        "fs": false,
        "net": false,
        "tls": false,
        "child_process": false,
        "worker_threads": false,
        "perf_hooks": false,
      };

      // Add plugins to provide globals
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
      ];

      // Ignore source map warnings for specific modules
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Module not found: Error: Can't resolve 'fs' in/,
        /Module not found: Error: Can't resolve 'net' in/,
        /Module not found: Error: Can't resolve 'tls' in/,
        /Module not found: Error: Can't resolve 'child_process' in/,
        /Module not found: Error: Can't resolve 'worker_threads' in/,
        /Module not found: Error: Can't resolve 'perf_hooks' in/,
      ];

      return webpackConfig;
    },
  },
};
