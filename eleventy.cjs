const path = require("path");
const { createSSRApp } = require('vue');
const { renderToString } = require('vue/server-renderer');

module.exports = function(eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig
    .addPassthroughCopy("lib/")
    .addPassthroughCopy("*.css")
    .addPassthroughCopy("*.js");

  eleventyConfig.setServerOptions({
    domdiff: false,
    // enabled: false, // incompatible with the import maps example https://github.com/11ty/eleventy-dev-server/issues/31
  })

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  });

  // TODO Vue SFC
  eleventyConfig.addFilter("vueSSR", async (filename) => {
    let appDefinition = await import(filename);
    let app = createSSRApp(appDefinition.default);
    let html = await renderToString(app);

    let parsed = path.parse(filename);
    return {
      // TODO css
      html,
      clientJsUrl: "/" + path.join(parsed.dir, parsed.base),
    }
  });

  return {
    htmlTemplateEngine: "liquid",
  }
};