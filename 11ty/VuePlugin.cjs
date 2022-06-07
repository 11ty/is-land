const path = require("path");
const { createSSRApp } = require('vue');
const { renderToString } = require('vue/server-renderer');

module.exports = function(eleventyConfig) {
  // TODO Vue SFC
  eleventyConfig.addFilter("vueSSR", async (filename) => {
    let appDefinition = await import(path.join("../", filename));
    let app = createSSRApp(appDefinition.default);
    let html = await renderToString(app);

    let parsed = path.parse(filename);
    return {
      // TODO css
      html,
      clientJsUrl: "/" + path.join(parsed.dir, parsed.base),
    }
  });
};