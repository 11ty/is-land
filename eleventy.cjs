const { createSSRApp } = require('vue');
const { renderToString } = require('vue/server-renderer');
const serializeJavascript = require('serialize-javascript');

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

  eleventyConfig.addShortcode("renderVueComponent", async (id, componentFile) => {
    let appDefinition = require(componentFile);
    let app = createSSRApp(appDefinition);
    let html = await renderToString(app);

    return `<div id="${id}">${html}</div>

<script type="module/island">
  import { createSSRApp } from "https://unpkg.com/vue@3.2.36/dist/vue.esm-browser.prod.js";

  let app = createSSRApp(${serializeJavascript(appDefinition)})
  app.mount("#${id}");
</script>`
  });

  return {
    htmlTemplateEngine: "liquid",
  }
};