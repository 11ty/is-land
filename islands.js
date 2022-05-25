const DEFAULT_TAG_NAME = "is-land";

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
    let parents = Island.getParents(el, DEFAULT_TAG_NAME);
    let imports = await Promise.all(parents.map(el => el.wait()));

    // return innermost module import
    if(imports.length) {
      return imports[0];
    }
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
    this.loading = this.getAttribute(this.attrs.loading);
    this.frameworkType = this.getAttribute(this.attrs.type);

    // if any ancestor has `on=""`
    let selector = Object.keys(this.conditionMap).map(key => `${DEFAULT_TAG_NAME}[on\\:${key}]`).join(",");
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
    return this.querySelector(`:scope > script[init]`);
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
    // Loading conditions must finish before additional dependencies are loaded
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
    if(componentInitFn?.default && typeof componentInitFn.default === "function") {
      await componentInitFn.default(mod);
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
    let events = ["focusin", "click", "touchstart"];
    // event overrides e.g. on:interaction="mouseenter"
    if(eventOverrides) {
      events = (eventOverrides || "").split(",");
    }

    return new Promise(resolve => {
      function resolveFn() {
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
    return new Promise(resolve => {});
  }
}

// Should this auto define? Folks can redefine later using { component } export
if("customElements" in window) {
  window.customElements.define(DEFAULT_TAG_NAME, Island);
}

// To redefine as a different component
export const component = Island;

export const ready = Island.ready;
