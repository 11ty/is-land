const fs = require("fs");
const path = require("path");
const { Module } = require("module");
const svelteCompiler = require("svelte/compiler");
const { render } = require("svelte/server");

const FileTarget = require("./FileTarget.cjs");

class EleventySvelteComponent {
  constructor(filename, options = { ssr: true }) {
    this.filename = filename;
    this.parsed = path.parse(filename);
    this.content = fs.readFileSync(filename, "utf8");
    this.isSSR = options.ssr;
    // No longer used, deferring to import maps directly.
    this.clientImportMap = {};
  }

  // pass in `hydratable: false, css: true` for a client only component
  async generateClientBundle() {
    let options = {
      filename: this.filename,
      generate: "client",
      discloseVersion: false,
      css: 'external', // injected will include it in the bundle, but we don’t need this
    };

    let component = svelteCompiler.compile(this.content, options);

    let target = new FileTarget(this.filename);

    await target.write(component.js.code, this.clientImportMap);

    return target;
  }

  renderOnServer() {
    if(!this.isSSR) {
      return {
        html: "",
        css: "",
      };
    }

    let component = svelteCompiler.compile(this.content, {
      filename: this.filename,
      generate: "server",
    });

    // Careful this is Node specific stuff https://github.com/sveltejs/svelte/blob/dafbdc286eef3de2243088a9a826e6899e20465c/register.js
    let m = new Module();
    m.paths = module.paths;
    m._compile(component.js.code, this.filename);

    let data = {};
    // https://svelte.dev/docs/svelte/svelte-server#render
    let result = render(m.exports.default, data);

    return {
      html: result.html,
      css: component.css.code
    };
  }

  async get() {
    let target = await this.generateClientBundle();
    let {html, css} = this.renderOnServer();

    return {
      html,
      css,
      clientJsUrl: target.getImportUrl()
    };
  }
}

module.exports = EleventySvelteComponent;