const EleventySvelteComponent = require("./11ty/EleventySvelteComponent.cjs");

module.exports = function(eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig
    .addPassthroughCopy("lib/")
    .addPassthroughCopy("*.css")
    .addPassthroughCopy("*.js");

  eleventyConfig.setServerOptions({
    domdiff: false,
    // enabled: false, // incompatible with the import maps example https://github.com/11ty/eleventy-dev-server/issues/31
  });

  eleventyConfig.addFilter("svelteComponentUrl", async function(filename) {
    let component = new EleventySvelteComponent(filename, {
      ssr: false,
    });

    let {clientJsUrl} = component.get();
    return clientJsUrl;
  });

  eleventyConfig.addFilter("svelteSSR", async function(filename) {
    let component = new EleventySvelteComponent(filename, {
      ssr: true,
    });

    return component.get();
  });

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  });

  return {
    htmlTemplateEngine: "liquid",
  }
};