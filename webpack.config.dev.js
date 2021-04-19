/**
 * A webpack dev server that starts a web server and proxies content through
 * to FIN's web server.
 *
 * In order to use this, FIN needs to be started with noAuth...
 *
 * fin -noAuth
 */

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WriteFilePlugin = require('write-file-webpack-plugin')

const finURL = `http://${process.env.FIN_HOST || 'localhost:8085'}`

module.exports = {
	mode: 'development',
	entry: './src/globalEntry.ts',
	devtool: 'inline-module-source-map',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.(html)$/,
				use: 'html-loader',
			},
		],
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		publicPath: './',
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
	},
	optimization: {
		// Disable minification so all symbols show up
		// when using Google Chrome debugger.
		minimize: false,
	},
	plugins: [
		new WriteFilePlugin(),
		new CopyWebpackPlugin(
			{
				patterns: [
					{
						from: 'assets/*.zinc',
						to: 'assets/',
						force: true,
						flatten: true,
					},
				],
			},
			{ logLevel: 'debug' }
		),
		new HtmlWebpackPlugin({
			template: './assets/devServer.html',
		}),
	],
	devServer: {
		hot: true,
		inline: true,
		historyApiFallback: true,
		host: '0.0.0.0',
		disableHostCheck: true,
		publicPath: '/',
		port: 8081,
		contentBase: path.resolve(__dirname, 'dist'),
		proxy: {
			'/auth/*': finURL,
			'/api/*': finURL,
			'/fin5Lang/*': finURL,
			'/finStackAuth/*': finURL,
			'/finGetFile/*': finURL,
			'/user/*': finURL,
			'/fin5/*': finURL,
			'/finPod/*': finURL,
			'/haystackProxy/*': finURL,
			'/haystack/*': finURL,
		},
	},
}
