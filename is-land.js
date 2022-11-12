const islandOnceCache = new Map();

class Island extends HTMLElement {
  static tagName = "is-land";
  static prefix = "is-land--"

  static fallback = {
    ":scope :not(:defined):not([ssr])": (readyPromise, node, prefix) => {
      // remove from document to prevent web component init
      let cloned = document.createElement(prefix + node.localName);
      for(let attr of node.getAttributeNames()) {
        cloned.setAttribute(attr, node.getAttribute(attr));
      }

      // Declarative Shadow DOM
      let shadowroot = node.shadowRoot;
      if(!shadowroot) {
        // polyfill
        let tmpl = node.querySelector(":scope > template[shadowroot]");
        shadowroot = node.attachShadow({ mode: "open" });
        shadowroot.appendChild(tmpl.content.cloneNode(true));
      }
      // cheers to https://gist.github.com/developit/45c85e9be01e8c3f1a0ec073d600d01e
      if(shadowroot) {
        cloned.attachShadow({ mode: shadowroot.mode }).append(...[].map.call(shadowroot.childNodes, c => c.cloneNode(true)));
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
      template: "data-island",
      ready: "ready",
    };

    // Internal promises
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
  }

  // <is-land> parent nodes (that *have* island conditions)
  static getParents(el, stopAt = false) {
    let nodes = [];
    while(el) {
      if(el.matches && el.matches(Island.tagName)) {
        if(stopAt && el === stopAt) {
          break;
        }

        if(Conditions.hasConditions(el)) {
          nodes.push(el);
        }
      }
      el = el.parentNode;
    }
    return nodes;
  }

  static async ready(el) {
    let parents = Island.getParents(el);
    if(parents.length === 0) {
      return;
    }

    let imports = await Promise.all(parents.map(el => el.wait()));
    // return innermost module import
    if(imports.length) {
      return imports[0];
    }
  }

  forceFallback() {
    if(window.Island) {
      Object.assign(Island.fallback, window.Island.fallback);
    }

    for(let selector in Island.fallback) {
      // Reverse here as a cheap way to get the deepest nodes first
      let components = Array.from(this.querySelectorAll(selector)).reverse();

      // with thanks to https://gist.github.com/cowboy/938767
      for(let node of components) {
        // must be connected, must not be an island
        if(!node.isConnected || node.localName === Island.tagName) {
          continue;
        }

        let p = Island.ready(node);
        Island.fallback[selector](p, node, Island.prefix);
      }
    }
  }

  wait() {
    return this.ready;
  }

  async connectedCallback() {
    // Only use fallback content with loading conditions
    if(Conditions.hasConditions(this)) {
      // Keep fallback content without initializing the components
      this.forceFallback();
    }

    await this.hydrate();
  }

  getTemplates() {
    return this.querySelectorAll(`:scope template[${this.attrs.template}]`);
  }

  replaceTemplates(templates) {
    // replace <template> with the live content
    for(let node of templates) {
      // if the template is nested inside another child <is-land> inside, skip
      if(Island.getParents(node, this).length > 0) {
        continue;
      }

      let value = node.getAttribute(this.attrs.template);
      // get rid of the rest of the content on the island
      if(value === "replace") {
        let children = Array.from(this.childNodes);
        for(let child of children) {
          this.removeChild(child);
        }
        this.appendChild(node.content);
        break;
      } else {
        let html = node.innerHTML;
        if(value === "once" && html) {
          if(islandOnceCache.has(html)) {
            node.remove();
            return;
          }

          islandOnceCache.set(html, true);
        }

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

    let attrs = Conditions.getConditions(this);
    for(let condition in attrs) {
      if(Conditions.map[condition]) {
        conditions.push(Conditions.map[condition](attrs[condition], this));
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

    if(mod) {
      // Use `import=""` for when import maps are available e.g. `import="petite-vue"`
      let fn = Island.autoinit[this.getAttribute(this.attrs.autoInitType) || importScript];

      if(fn) {
        await fn.call(this, mod);
      }
    }

    this.readyResolve({
      import: mod
    });

    this.setAttribute(this.attrs.ready, "");
  }
}

class Conditions {
  static map = {
    visible: Conditions.visible,
    idle: Conditions.idle,
    interaction: Conditions.interaction,
    media: Conditions.media,
    "save-data": Conditions.saveData,
  };

  static hasConditions(node) {
    return Object.keys(Conditions.getConditions(node)).length > 0;
  }

  static getConditions(node) {
    let map = {};
    for(let key of Object.keys(Conditions.map)) {
      if(node.hasAttribute(`on:${key}`)) {
        map[key] = node.getAttribute(`on:${key}`);
      }
    }

    return map;
  }

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
