/** @type {import('@remix-run/dev').AppConfig} */
export default {
  appDirectory: "app",
  publicPath: "/build/",
  assetsBuildDirectory: "public/build",
  serverBuildPath: "build/server/index.js",
  serverModuleFormat: "esm",
  ignoredRouteFiles: ["**/*.test.*"]
};
