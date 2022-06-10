class Island extends HTMLElement {
  static tagName = "is-land";

  static fallback = {
    ":not(:defined)": (readyPromise, node, prefix) => {
      // remove from document to prevent web component init
      let cloned = document.createElement(prefix + node.localName);
      for(let attr of node.getAttributeNames()) {
        cloned.setAttribute(attr, node.getAttribute(attr));
      }

      let children = Array.from(node.childNodes);
      for(let child of children) {
        cloned.append(child); // Keep the *same* child nodes, clicking on a details->summary child should keep the state of that child
      }
      node.replaceWith(cloned);

      return readyPromise.then(() => {
        // restore children (not cloned)
        for(let child of Array.from(cloned.childNodes)) {
          node.append(child);
        }
        cloned.replaceWith(node);
      });
    }
  };

  static autoinit = {
    "petite-vue": function(library) {
      library.createApp().mount(this);
    },
    "vue": function(library) {
      library.createApp().mount(this);
    },
    "svelte": function(mod) {
      new mod.default({ target: this });
    },
    "svelte-ssr": function(mod) {
      new mod.default({ target: this, hydrate: true });
    },
    "preact": function(mod) {
      mod.default(this);
    }
  }

  constructor() {
    super();

    this.attrs = {
      autoInitType: "autoinit",
      import: "import",
      scriptType: "module/island",
      template: "data-island",
      ready: "ready",
    };

    this.conditionMap = {
      visible: Conditions.visible,
      idle: Conditions.idle,
      interaction: Conditions.interaction,
      media: Conditions.media,
      "save-data": Conditions.saveData,
    };

    // Internal promises
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  static getParents(el, selector) {
    let nodes = [];
    while(el) {
      if(el.matches && el.matches(selector)) {
        nodes.push(el);
      }
      el = el.parentNode;
    }
    return nodes;
  }

  static async ready(el) {
    let parents = Island.getParents(el, Island.tagName);
    let imports = await Promise.all(parents.map(el => el.wait()));

    // return innermost module import
    if(imports.length) {
      return imports[0];
    }
  }

  async forceFallback() {
    let prefix = Island.tagName + "--";
    let promises = [];

    if(window.Island) {
      Object.assign(Island.fallback, window.Island.fallback);
    }

    for(let selector in Island.fallback) {
      // Reverse here as a cheap way to get the deepest nodes first
      let components = Array.from(this.querySelectorAll(selector)).reverse();

      // with thanks to https://gist.github.com/cowboy/938767
      for(let node of components) {
        if(!node.isConnected || node.localName === Island.tagName) {
          continue;
        }

        let readyPromise = Island.ready(node);
        promises.push(Island.fallback[selector](readyPromise, node, prefix));
      }
    }

    return promises;
  }

  wait() {
    return this.ready;
  }

  getConditions() {
    let map = {};
    for(let key of Object.keys(this.conditionMap)) {
      if(this.hasAttribute(`on:${key}`)) {
        map[key] = this.getAttribute(`on:${key}`);
      }
    }

    return map;
  }

  async connectedCallback() {
    // Keep fallback content without initializing the components
    // TODO improvement: only run this for not-eager components?
    await this.forceFallback();

    await this.hydrate();
  }

  getInitScripts() {
    return this.querySelectorAll(`:scope script[type="${this.attrs.scriptType}"]`);
  }

  getTemplates() {
    return this.querySelectorAll(`:scope template[${this.attrs.template}]`);
  }

  replaceTemplates(templates) {
    // replace <template> with the live content
    for(let node of templates) {
      // get rid of the rest of the content on the island
      if(node.getAttribute(this.attrs.template) === "replace") {
        let children = Array.from(this.childNodes);
        for(let child of children) {
          this.removeChild(child);
        }
        this.appendChild(node.content);
        break;
      } else {
        node.replaceWith(node.content);
      }
    }
  }

  async hydrate() {
    let conditions = [];
    if(this.parentNode) {
      // wait for all parents before hydrating
      conditions.push(Island.ready(this.parentNode));
    }
    let attrs = this.getConditions();
    for(let condition in attrs) {
      if(this.conditionMap[condition]) {
        conditions.push(this.conditionMap[condition](attrs[condition], this));
      }
    }
    // Loading conditions must finish before dependencies are loaded
    await Promise.all(conditions);

    this.replaceTemplates(this.getTemplates());

    let mod;
    // [dependency="my-component-code.js"]
    let importScript = this.getAttribute(this.attrs.import);
    if(importScript) {
      // we could resolve import maps here manually but you’d still have to use the full URL in your script’s import anyway
      mod = await import(importScript);
    }

    // do nothing if has script[type="module/island"], will init manually in script via ready()
    let initScripts = this.getInitScripts();

    if(initScripts.length > 0) {
      // activate <script type="module/island">
      for(let old of initScripts) {
        let script = document.createElement("script");
        script.setAttribute("type", "module");
        // Idea: *could* modify this content to retrieve access to the modules therein
        script.textContent = old.textContent;
        old.replaceWith(script);
      }
    } else if(mod) {
      // Fallback to `import=""` for when import maps are available e.g. `import="petite-vue"`
      let fn = Island.autoinit[this.getAttribute(this.attrs.autoInitType) || importScript];

      if(fn) {
        await fn.call(this, mod);
      }
    }
    
    // When using <script type="module/island"> `readyResolve` will fire before any internal imports finish!
    this.readyResolve({
      import: mod
    });

    this.setAttribute(this.attrs.ready, "");
  }
}

class Conditions {
  static visible(noop, el) {
    if(!('IntersectionObserver' in window)) {
      // runs immediately
      return;
    }

    return new Promise(resolve => {
      let observer = new IntersectionObserver(entries => {
        let [entry] = entries;
        if(entry.isIntersecting) {
          observer.unobserve(entry.target);
          resolve();
        }
      });

      observer.observe(el);
    });
  }

  // TODO make sure this runs after all of the conditions have finished, otherwise it will
  // finish way before the other lazy loaded promises and will be the same as a noop when
  // on:interaction or on:visible finishes much later
  static idle() {
    let onload = new Promise(resolve => {
      if(document.readyState !== "complete") {
        window.addEventListener("load", () => resolve(), { once: true });
      } else {
        resolve();
      }
    });

    if(!("requestIdleCallback" in window)) {
      // run immediately
      return onload;
    }

    // both idle and onload
    return Promise.all([
      new Promise(resolve => {
        requestIdleCallback(() => {
          resolve();
        });
      }),
      onload,
    ]);
  }

  static interaction(eventOverrides, el) {
    let events = ["click", "touchstart"];
    // event overrides e.g. on:interaction="mouseenter"
    if(eventOverrides) {
      events = (eventOverrides || "").split(",").map(entry => entry.trim());
    }

    return new Promise(resolve => {
      function resolveFn(e) {
        resolve();

        // cleanup the other event handlers
        for(let name of events) {
          el.removeEventListener(name, resolveFn);
        }
      }

      for(let name of events) {
        el.addEventListener(name, resolveFn, { once: true });
      }
    });
  }

  static media(query) {
    let mm = {
      matches: true
    };

    if(query && ("matchMedia" in window)) {
      mm = window.matchMedia(query);
    }

    if(mm.matches) {
      return;
    }

    return new Promise(resolve => {
      mm.addListener(e => {
        if(e.matches) {
          resolve();
        }
      });
    });
  }

  static saveData(expects) {
    // return early if API does not exist
    if(!("connection" in navigator) || navigator.connection.saveData === (expects !== "false")) {
      return Promise.resolve();
    }

    // dangly promise
    return new Promise(() => {});
  }
}

// Should this auto define? Folks can redefine later using { component } export
if("customElements" in window) {
  window.customElements.define(Island.tagName, Island);
  window.Island = Island;
}

export const component = Island;

export const ready = Island.ready;
