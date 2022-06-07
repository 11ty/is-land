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
  })

  eleventyConfig.addShortcode("renderSvelte", async function(filename) {
    let component = new EleventySvelteComponent(filename);
    component.generateClientBundle();

    let { html, css } = component.renderOnServer();

    return `
    <style>${css.code}</style>
    <div id="svelte-app">${html}</div>
  <script type="module/island">
  import App from '${component.getImportUrl()}';

  new App({
    target: document.getElementById('svelte-app'),
    hydrate: true,
    props: {
      // If you pass a prop in here it must be declared using export in the component
    },
  });
  </script>
`;
  });

  eleventyConfig.addGlobalData("permalink", () => {
    return (data) => `${data.page.filePathStem}.${data.page.outputFileExtension}`;
  });

  return {
    htmlTemplateEngine: "liquid",
  }
};