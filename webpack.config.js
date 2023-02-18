const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require( 'copy-webpack-plugin' );
const WorkboxPlugin = require('workbox-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

const webpackConfig = {
  mode: isProd ? 'production' : 'development',
  context: process.cwd(),
  entry: {
    "avif-polyfill" : path.resolve(__dirname, 'src/index.ts'),
  },
  module: {
    rules: [
      {
        test: /\.[tjmc]sx?$/,
        use: ['babel-loader']
      },
      {
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].wasm',
        },
      },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', 'js'],
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    publicPath: '/',
    chunkFilename: '[name].js',
    filename: ({runtime}) => {
      // Check if the current filename is for the service worker:
      if (runtime === 'avif-sw') {
        // Output a service worker in the root of the dist directory
        // Also, ensure the output file name doesn't have a hash in it
        return '[name].js';
      }

      // Otherwise, output files as normal
      return './dist/[name].js';
    },
    clean: true,
    umdNamedDefine: true,
    globalObject: 'this',
    library: {
      name: 'avif-polyfill',
      type: 'umd'
    }
  },
  devtool: 'source-map',
  plugins: [
    new CleanWebpackPlugin(),
    new WorkboxPlugin.GenerateSW({
      // these options encourage the ServiceWorkers to get in there fast
      // and not allow any straggling "old" SWs to hang around
      skipWaiting: true,
    }),
    new CopyPlugin( {
      patterns: [
        {
          from: 'node_modules/dav1d.js/dav1d.wasm*',
          to: 'dist/[name][ext]',
        },
        {
          from: './doc-template',
          to: '.',
        },
      ],
    } ),
  ],
  optimization: {
    usedExports: true,
    splitChunks: {
      chunks: 'all'
    },
    minimize: true,
    minimizer: [
      new TerserPlugin()
    ]
  }
}

module.exports = webpackConfig
