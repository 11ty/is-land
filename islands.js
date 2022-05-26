const TAG_NAME = "is-land";

class Island extends HTMLElement {
  constructor(root) {
    super();
    this.root = root || window;

    // TODO Testing only
    this.classList.add("test-waiting");

    this.attrs = {
      loading: "loading",
      type: "type",
      init: "on",
      componentScript: "dependency",
      forcedFallback: "fallback",
      childNodeInit: "data-is-land"
    };

    this.conditionMap = {
      visible: Conditions.waitForVisible,
      idle: Conditions.waitForIdle,
      interaction: Conditions.waitForInteraction,
      media: Conditions.waitForMedia,
      "save-data": Conditions.checkSaveData,
    };

    // Internal promises
    this.modules = {};
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
    let parents = Island.getParents(el, TAG_NAME);
    let imports = await Promise.all(parents.map(el => el.wait()));

    // return innermost module import
    if(imports.length) {
      return imports[0];
    }
  }

  async forceFallback() {
    // Reverse here as a cheap way to get the deepest nodes first
    let components = Array.from(this.querySelectorAll(":not(:defined)")).reverse();
    let promises = [];

    // with thanks to https://gist.github.com/cowboy/938767
    for(let node of components) {
      if(!node.isConnected) {
        continue;
      }

      // assign this before we remove it from the document
      let readyP = Island.ready(node);

      // remove from document to prevent web component init
      let cloned = document.createElement("is-land-waiting--" + node.localName);
      let children = Array.from(node.childNodes);
      for(let child of children) {
        cloned.append(child); // Keep the *same* child nodes, clicking on a details->summary child should keep the state of that child
      }
      node.replaceWith(cloned);

      promises.push(readyP.then(() => {
        // restore children (not cloned)
        for(let child of Array.from(cloned.childNodes)) {
          node.append(child);
        }
        cloned.replaceWith(node);
      }));
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
    if(this.getAttribute(this.attrs.forcedFallback) === "auto") {
      await this.forceFallback();
    }

    this.loading = this.getAttribute(this.attrs.loading);
    this.frameworkType = this.getAttribute(this.attrs.type);

    // if any ancestor has `on=""`
    let selector = Object.keys(this.conditionMap).map(key => `${TAG_NAME}[on\\:${key}]`).join(",");
    let hasAnyInitCondition = Island.getParents(this, selector).length > 0;

    // even with an init condition, you can bypass with `loading="eager"` to load dependencies up front
    if(!hasAnyInitCondition || this.loading === "eager") {
      await this.loadDependencies();
    }

    await this.hydrate();
  }

  async loadDependencies() {
    if(!this.frameworkType) {
      return;
    }

    // Load library once per framework
    if(!this.modules[this.frameworkType]) {
      // TODO use local bundle, maybe with import maps and a deep url package ref?
      // Compatible with import maps
      this.modules[this.frameworkType] = import(this.frameworkType);
    }

    return this.modules[this.frameworkType];
  }

  hasInitScript() {
    return this.querySelector(`:scope > script[${this.attrs.childNodeInit}]`);
  }

  getTemplates() {
    return this.querySelectorAll(`:scope template[${this.attrs.childNodeInit}]`);
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

    let mods = [];
    // hasn’t yet loaded deps
    if(!this.modules[this.frameworkType]) {
      mods.push(this.loadDependencies());
    } else {
      mods.push(this.modules[this.frameworkType]);
    }

    // dependency="my-component-code.js"
    let componentScript = this.getAttribute(this.attrs.componentScript);
    if(componentScript) {
      mods.push(import(componentScript));
    }

    let [mod, componentInitFn] = await Promise.all(mods);

    // run the async function returned from the dependency script
    if(componentInitFn && componentInitFn.default && typeof componentInitFn.default === "function") {
      await componentInitFn.default(mod);
    }

    // replace <template> with the live content
    let tmpls = this.getTemplates();
    for(let node of tmpls) {
      node.replaceWith(node.content);
    }

    // do nothing if has script[init], will init manually in script via ready()
    let hasInitScript = this.hasInitScript();
    if(this.frameworkType === "petite-vue" || this.frameworkType === "vue") {
      if(!hasInitScript) {
        mod.createApp().mount(this);
      }
    }

    this.readyResolve(this.modules[this.frameworkType]);

    // TODO Testing only
    this.classList.remove("test-waiting");
    this.classList.add("test-finish");
    if(!window.componentCount) {
      window.componentCount = 0;
    }
    window.componentCount++
    console.log( `${window.componentCount} island${window.componentCount !== 1 ? "s" : ""}`, this );
    // End testing
  }
}

class Conditions {
  static waitForVisible(noop, el) {
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

  static waitForIdle() {
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

  static waitForInteraction(eventOverrides, el) {
    let events = ["click", "touchstart"];
    // event overrides e.g. on:interaction="mouseenter"
    if(eventOverrides) {
      events = (eventOverrides || "").split(",");
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

  static waitForMedia(query) {
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

  static checkSaveData(expects) {
    if("connection" in navigator && navigator.connection.saveData === (expects !== "false")) {
      return Promise.resolve();
    }

    // dangly promise
    return new Promise(() => {});
  }
}

// Should this auto define? Folks can redefine later using { component } export
if("customElements" in window) {
  window.customElements.define(TAG_NAME, Island);
}

// To redefine as a different component
export const component = Island;

export const ready = Island.ready;
