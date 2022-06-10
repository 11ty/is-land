const EleventySveltePlugin = require("./11ty/SveltePlugin.cjs");
const EleventyVuePlugin = require("./11ty/VuePlugin.cjs");
const EleventyPreactPlugin = require("./11ty/PreactPlugin.cjs");
const EleventyIslandMarkdownPlugin = require("./11ty/MarkdownPlugin.cjs");

module.exports = function(eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig.addPassthroughCopy("lib/**/*.{css,png,svg,js}");
  eleventyConfig.addPassthroughCopy("*.{css,js}");

  eleventyConfig.setServerOptions({
    domdiff: false,
    // enabled: false, // incompatible with the import maps example https://github.com/11ty/eleventy-dev-server/issues/31
  });

  eleventyConfig.ignores.add("README.md");

  eleventyConfig.addPlugin(EleventySveltePlugin);
  eleventyConfig.addPlugin(EleventyVuePlugin);
  eleventyConfig.addPlugin(EleventyPreactPlugin);
  eleventyConfig.addPlugin(EleventyIslandMarkdownPlugin);

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  });

  return {
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
  }
};