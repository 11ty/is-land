const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { transformAsync } = require("@babel/core");

const FileTarget = require("./FileTarget.cjs");

// Server modules live inside node_modules so their bare `solid-js` imports resolve.
const SERVER_CACHE_DIR = path.join(__dirname, "../node_modules/.cache/is-land-solid");

async function compile(content, filename, generate) {
  let { code } = await transformAsync(content, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [
      ["babel-preset-solid", { generate, hydratable: true }],
    ],
  });
  return code;
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addFilter("solid", async (filename, renderId = "") => {
    let content = fs.readFileSync(filename, "utf8");

    let target = new FileTarget(filename);
    await target.write(await compile(content, filename, "dom"));

    let serverFile = path.join(SERVER_CACHE_DIR, `${target.parsed.name}.server.${Date.now()}.js`);
    fs.mkdirSync(SERVER_CACHE_DIR, { recursive: true });
    fs.writeFileSync(serverFile, await compile(content, filename, "ssr"), "utf8");

    let { default: Component } = await import(pathToFileURL(serverFile));
    let { renderToString, generateHydrationScript } = await import("solid-js/web");
    fs.rmSync(serverFile);

    return {
      html: renderToString(() => Component(), { renderId }),
      hydrationScript: generateHydrationScript(),
      clientJsUrl: target.getImportUrl(),
    };
  });
};
