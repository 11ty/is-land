const EleventySveltePlugin = require("./11ty/SveltePlugin.cjs");
const EleventyVuePlugin = require("./11ty/VuePlugin.cjs");
const EleventyPreactPlugin = require("./11ty/PreactPlugin.cjs");
const EleventyIslandMarkdownPlugin = require("./11ty/MarkdownPlugin.cjs");

module.exports = function(eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig.addPassthroughCopy("lib/**/*.{css,png,svg,js}");
  eleventyConfig.addPassthroughCopy("demo/**/*.{css,js}");
  eleventyConfig.addPassthroughCopy("*.js");

  eleventyConfig.setServerOptions({
    domdiff: false,
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
    dir: {
      input: "demo",
    },
    htmlTemplateEngine: "liquid",
    markdownTemplateEngine: "liquid",
  }
};