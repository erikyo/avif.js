const path = require('path')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const isProd = process.env.NODE_ENV === 'production'

const webpackConfig = {
  mode: isProd ? 'production' : 'development',
  context: process.cwd(),
  entry: {
    'avif-polyfill': {
      import: path.resolve(__dirname, 'src/index.ts'),
      library: {
        name: 'avifPolyfill',
        type: 'umd'
      }
    },
    'avif-sw': path.resolve(__dirname, 'src/avif-sw.ts')
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
          filename: '[name].wasm'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    publicPath: '/',
    chunkFilename: '[name].js',
    globalObject: 'this',
    filename: (runtime) => {
      // Check if the current filename is for the service worker:
      if (runtime.chunk.runtime === 'avif-sw') {
        // Output a service worker in the root of the dist directory
        // Also, ensure the output file name doesn't have a hash in it
        return '[name].js'
      }

      // Otherwise, output files as normal
      return 'dist/[name].js'
    },
    clean: true
  },
  devtool: 'source-map',
  devServer: {
    https: true,
    static: {
      directory: path.join(__dirname, 'docs')
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        {
          from: 'node_modules/dav1d.js/dav1d.wasm*',
          to: 'dist/[name][ext]'
        },
        {
          from: './doc-template',
          to: '.'
        }
      ]
    })
  ],
  optimization: {
    usedExports: true
  }
}

module.exports = webpackConfig
