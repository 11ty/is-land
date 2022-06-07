const EleventySvelteComponent = require("./SvelteComponent.cjs");

module.exports = function(eleventyConfig) {
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
};