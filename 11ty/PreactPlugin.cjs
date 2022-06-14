const fs = require("fs");
const path = require("path");
const render = require('preact-render-to-string');

const FileTarget = require("./FileTarget.cjs");

module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("preact", async (filename) => {
    let content = fs.readFileSync(filename, "utf8");
    let target = new FileTarget(filename);
    target.write(content, {
      imports: {
        // For this demo I’m using unpkg for the Preact library
        "htm/preact": "https://unpkg.com/htm/preact/index.mjs?module"
      }
    });

    let appDefinition = await import(path.join("../", filename));
    let output = render(appDefinition.default());

    return {
      html: output,

      // Uses `addPassthroughCopy("lib/")` for this file to exist in the output directory
      clientJsUrl: target.getImportUrl(),
    }
  });
};