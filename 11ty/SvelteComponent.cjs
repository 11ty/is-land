const fs = require("fs");
const path = require("path");
const { Module } = require("module");
const svelte = require('svelte/compiler');

const FileTarget = require("./FileTarget.cjs");

class EleventySvelteComponent {
  constructor(filename, options = { ssr: true }) {
    this.filename = filename;
    this.parsed = path.parse(filename);
    this.content = fs.readFileSync(filename, "utf8");
    this.isSSR = options.ssr;

    this.clientImportMap = {
      imports: {
        // For this demo I’m using unpkg for the Svelte library
        "svelte/internal": "https://unpkg.com/svelte@3.48.0/internal/index.mjs"
      }
    };
  }

  // pass in `hydratable: false, css: true` for a client only component
  generateClientBundle() {
    let options = {
      filename: this.filename,
      generate: "dom",
      hydratable: this.isSSR ? true : false,
      css: this.isSSR ? false : true,
    };

    let component = svelte.compile(this.content, options);

    let target = new FileTarget(this.filename);
    // we transform the import URL here instead of using `sveltePath` option above, which tried to use the `cjs` not the `mjs`  version on unpkg
    target.write(component.js.code, this.clientImportMap);
    return target;
  }

  renderOnServer() {
    if(!this.isSSR) {
      return {
        html: "",
        css: "",
      };
    }

    let component = svelte.compile(this.content, {
      filename: this.filename,
      generate: "ssr",
      format: "cjs",
    });

    // Careful this is Node specific stuff https://github.com/sveltejs/svelte/blob/dafbdc286eef3de2243088a9a826e6899e20465c/register.js
    let m = new Module();
    m.paths = module.paths;
    m._compile(component.js.code, this.filename);

    let fn = m.exports.default.render;
    let result = fn();
    return {
      html: result.html.replace(/\n/g, ""),
      css: result.css.code
    };
  }

  get() {
    let target = this.generateClientBundle();
    let {html, css} = this.renderOnServer();

    return {
      html: html.replace(/\n/g, ""),
      css,
      clientJsUrl: target.getImportUrl()
    };
  }
}

module.exports = EleventySvelteComponent;