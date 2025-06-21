import { execSync } from "child_process";
import CopyPlugin from "copy-webpack-plugin";
import ESLintPlugin from "eslint-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import path from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let gitCommit = process.env.GIT_COMMIT;
if (!gitCommit) {
  try {
    gitCommit = execSync("git rev-parse HEAD").toString().trim();
  } catch (error) {
    // If not in a git repo, use a default value
    gitCommit = "development";
    console.warn("Not in a git repository, using 'development' as commit hash");
  }
}

export default async (env, argv) => {
  const isProduction = argv.mode === "production";
  // Allow overriding the backend host via environment variable
  const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';

  return {
    mode: isProduction ? "production" : "development",
    entry: "./src/client/Main.ts",
    output: {
      publicPath: "/",
      filename: isProduction ? "js/[name].[contenthash].js" : "js/[name].js",
      path: path.resolve(__dirname, "static"),
      clean: isProduction,
    },
    cache: isProduction ? false : {
      type: 'memory',
    },
    watchOptions: isProduction ? {} : {
      ignored: /node_modules/,
      aggregateTimeout: 300,
      poll: 1000, // Enable polling for WSL2 compatibility
    },
    module: {
      rules: [
        {
          test: /\.bin$/,
          type: "asset/resource", // Changed from raw-loader
          generator: {
            filename: isProduction ? "binary/[name].[contenthash][ext]" : "binary/[name][ext]",
          },
        },
        {
          test: /\.txt$/,
          type: "asset/resource", // Changed from raw-loader
          generator: {
            filename: isProduction ? "text/[name].[contenthash][ext]" : "text/[name][ext]",
          },
        },
        {
          test: /\.ts$/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: !isProduction,
              configFile: "tsconfig.client.json",
            },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                importLoaders: 1,
              },
            },
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: ["tailwindcss", "autoprefixer"],
                },
              },
            },
          ],
        },
        {
          test: /\.(webp|png|jpe?g|gif)$/i,
          type: "asset/resource",
          generator: {
            filename: isProduction ? "images/[name].[contenthash][ext]" : "images/[name][ext]",
          },
        },
        {
          test: /\.html$/,
          use: ["html-loader"],
        },
        {
          test: /\.svg$/,
          type: "asset/resource", // Changed from asset/inline for caching
          generator: {
            filename: isProduction ? "images/[name].[contenthash][ext]" : "images/[name][ext]",
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: "asset/resource", // Changed from file-loader
          generator: {
            filename: isProduction ? "fonts/[name].[contenthash][ext]" : "fonts/[name][ext]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      alias: {
        "protobufjs/minimal": path.resolve(
          __dirname,
          "node_modules/protobufjs/minimal.js",
        ),
      },
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/client/index.html",
        filename: "index.html",
        // Add optimization for HTML
        minify: isProduction
          ? {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              useShortDoctype: true,
            }
          : false,
      }),
      new webpack.DefinePlugin({
        "process.env.WEBSOCKET_URL": JSON.stringify(
          isProduction ? "" : "localhost:3000",
        ),
        "process.env.GAME_ENV": JSON.stringify(isProduction ? "prod" : "dev"),
        "process.env.GIT_COMMIT": JSON.stringify(gitCommit),
      }),
      ...(isProduction ? [
        new CopyPlugin({
          patterns: [
            {
              from: path.resolve(__dirname, "resources"),
              to: path.resolve(__dirname, "static"),
              noErrorOnMissing: true,
            },
          ],
          options: { concurrency: 100 },
        })
      ] : []),
      ...(isProduction ? [
        new ESLintPlugin({
          context: __dirname,
        })
      ] : []),
    ],
    optimization: {
      // Add optimization configuration for better caching
      runtimeChunk: isProduction ? "single" : false,
      splitChunks: isProduction ? {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
          },
        },
      } : false,
    },
    devServer: isProduction
      ? {}
      : {
          hot: true,
          liveReload: true,
          devMiddleware: { 
            writeToDisk: false,
            publicPath: '/',
            stats: 'minimal'
          },
          static: [
            {
              directory: path.join(__dirname, "static"),
              watch: false,
            },
            {
              directory: path.join(__dirname, "resources"),
              publicPath: "/",
              watch: true,
            },
          ],
          historyApiFallback: true,
          compress: true,
          host: '0.0.0.0', // Listen on all interfaces
          port: 9000,
          open: false,
          allowedHosts: 'all', // Allow connections from any host
          client: {
            logging: 'warn',
            overlay: {
              errors: true,
              warnings: false,
            },
            progress: false,
            reconnect: true,
          },
          proxy: [
            // WebSocket proxies
            {
              context: ["/socket"],
              target: `ws://${BACKEND_HOST}:3000`,
              ws: true,
              changeOrigin: true,
              logLevel: "debug",
            },
            // Worker WebSocket proxies - using direct paths without /socket suffix
            {
              context: ["/w0"],
              target: `ws://${BACKEND_HOST}:3001`,
              ws: true,
              secure: false,
              changeOrigin: true,
              logLevel: "debug",
            },
            {
              context: ["/w1"],
              target: `ws://${BACKEND_HOST}:3002`,
              ws: true,
              secure: false,
              changeOrigin: true,
              logLevel: "debug",
            },
            {
              context: ["/w2"],
              target: `ws://${BACKEND_HOST}:3003`,
              ws: true,
              secure: false,
              changeOrigin: true,
              logLevel: "debug",
            },
            // Worker proxies for HTTP requests
            {
              context: ["/w0"],
              target: `http://${BACKEND_HOST}:3001`,
              pathRewrite: { "^/w0": "" },
              secure: false,
              changeOrigin: true,
              logLevel: "debug",
            },
            {
              context: ["/w1"],
              target: `http://${BACKEND_HOST}:3002`,
              pathRewrite: { "^/w1": "" },
              secure: false,
              changeOrigin: true,
              logLevel: "debug",
            },
            {
              context: ["/w2"],
              target: `http://${BACKEND_HOST}:3003`,
              pathRewrite: { "^/w2": "" },
              secure: false,
              changeOrigin: true,
              logLevel: "debug",
            },
            // Original API endpoints
            {
              context: [
                "/api/env",
                "/api/game",
                "/api/public_lobbies",
                "/api/join_game",
                "/api/start_game",
                "/api/create_game",
                "/api/archive_singleplayer_game",
                "/api/auth/callback",
                "/api/auth/discord",
                "/api/kick_player",
                "/api/party",
              ],
              target: `http://${BACKEND_HOST}:3000`,
              secure: false,
              changeOrigin: true,
            },
          ],
        },
  };
};
