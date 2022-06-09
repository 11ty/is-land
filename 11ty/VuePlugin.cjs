const path = require("path");
const { createSSRApp } = require('vue');
const { renderToString } = require('vue/server-renderer');

const FileTarget = require("./FileTarget.cjs");

module.exports = function(eleventyConfig) {
  // TODO Vue SFC
  eleventyConfig.addFilter("vue", async (filename) => {
    let target = new FileTarget(filename);
    target.setSuffix("");

    let appDefinition = await import(path.join("../", filename));
    let app = createSSRApp(appDefinition.default);
    let html = await renderToString(app);

    return {
      // TODO css
      html,

      // Uses `addPassthroughCopy("lib/")` for this file to exist in the output directory
      clientJsUrl: target.getImportUrl(),
    }
  });
};