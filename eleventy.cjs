const fsp = require('fs').promises;
const path = require('path');
const litPlugin = require('@lit-labs/eleventy-plugin-lit');
const { ImportTransformer } = require('esm-import-transformer');

module.exports = function(eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig
    .addPassthroughCopy("lib/")
    .addPassthroughCopy("*.css")
    .addPassthroughCopy("*.js");

  eleventyConfig.setServerOptions({
    domdiff: false,
    enabled: false,
  })

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  });


  let litComponents = [
    'lib/lit/lit-component.js',
    'lib/lit/lit-component-html-only.js',
  ];
  eleventyConfig.addPlugin(litPlugin, {
    mode: 'worker',
    componentModules: litComponents,
  });

  eleventyConfig.addWatchTarget("./lib/lit/*.js");

  // transform bare imports to CDN imports
  eleventyConfig.on("eleventy.after", async ({dir}) => {
    for(let c of litComponents) {
      let input = await fsp.readFile(c, "utf8");
      let importMap = {
        "imports": {
          "lit": "/lib/lit/experimental-hydrate-support.js"
        }
      };
      
      let i = new ImportTransformer();
      await fsp.writeFile(path.join(dir.output, c), i.transform(input, importMap), "utf8");
    }
  })

  return {
    htmlTemplateEngine: false,
  }
};