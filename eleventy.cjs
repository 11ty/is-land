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

  return {
    htmlTemplateEngine: false,
  }
};