const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const config = {
  entry: ['./src/autocomplete-module.js', './src/autocomplete.css'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'quill-placeholder-autocomplete-module.min.js',
    library: 'QuillPlaceholderAutocomplete',
    libraryExport: 'default',
    libraryTarget: 'umd'
  },
  externals: {
    quill: {
      root: 'Quill',
      commonjs2: 'quill',
      commonjs: 'quill',
      amd: 'quill'
    }
  },
  devServer: {
    contentBase: path.join(__dirname, "dist"),
    compress: true,
    port: 9000
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: [{
            loader: 'css-loader',
            options: {
              minimize: true
            }
          }]
        }),
      },
      {
        test: /\.js$/,
        include: [
          path.resolve(__dirname, "src")
        ],
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [ 'env' ]
          }
        }
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin('quill-placeholder-autocomplete.css'),
    new UglifyJSPlugin({
      uglifyOptions: {
        warnings: false,
        compress: {
          ie8: false,
          conditionals: true,
          unused: true,
          comparisons: true,
          sequences: true,
          dead_code: true,
          evaluate: true,
          join_vars: true,
          if_return: true
        },
        output: {
          comments: false
        }
      }
    }),
  ]
};

module.exports = config;