const fs = require("fs");
const path = require("path");
const { Module } = require("module");
const svelte = require('svelte/compiler');
const { ImportTransformer } = require("esm-import-transformer");

let id = 0;

class EleventySvelteComponent {
  constructor(filename) {
    this.filename = filename;
    this.parsed = path.parse(this.filename);
    this.content = fs.readFileSync(filename, "utf8");

    this.clientImportMap = {
      imports: {
        // For this demo I’m using unpkg for the Svelte library
        "svelte/internal": "https://unpkg.com/svelte@3.48.0/internal/index.mjs"
      }
    };
  }

  getImportUrl() {
    return "/" + path.join(this.parsed.dir, this.parsed.name + ".js");
  }

  // pass in `hydratable: false, css: true` for a client only component
  generateClientBundle(isSSR = true) {
    let options = {
      filename: this.filename,
      generate: "dom",
      hydratable: isSSR ? true : false,
      css: isSSR ? false : true,
    };

    let component = svelte.compile(this.content, options);

    // instead of the `sveltePath` option above, which tried to use the `cjs` not the `mjs`  version on unpkg
    let transformer = new ImportTransformer();
    let code = transformer.transform(component.js.code, this.clientImportMap)

    // TODO change _site to work with any output dir
    let outDir = path.join("./_site", this.parsed.dir);

    fs.mkdirSync(outDir, {recursive: true});
    fs.writeFileSync(path.join(outDir, this.parsed.name + ".js"), code, "utf8");
  }

  renderOnServer(isSSR = true) {
    if(!isSSR) {
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
      html: result.html,
      css: result.css.code
    };
  }

  renderIsland(isSSR = true) {
    this.generateClientBundle(isSSR);

    let {html, css} = this.renderOnServer(isSSR);

    id++;

    return `
  ${css ? `<style>${css}</style>` : ""}
  <div id="svelte-app-${id}">${html}</div>
  <script type="module/island">
  import App from '${this.getImportUrl()}';

  new App({
    target: document.getElementById('svelte-app-${id}'),
    ${isSSR ? "hydrate: true," : ""}
    props: {
      // If you pass a prop in here it must be declared using export in the component
    },
  });
  </script>
`;
  }
}

module.exports = EleventySvelteComponent;