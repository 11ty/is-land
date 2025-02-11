const win = window;
const doc = win.document;
const nav = win.navigator;

function resolvers() {
  if("withResolvers" in Promise) {
    return Promise.withResolvers();
  }

  let promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

class Island extends HTMLElement {
  static tagName = "is-land";
  static prefix = "is-land--";

  static attr = {
    template: "data-island",
    ready: "ready",
    defer: "defer-hydration",
  };

  static onceCache = new Map();
  static onReady = new Map();

  static ctm() {
    // Browser Support:
    // spread Chrome 46 Firefox 16 Safari 8
    // computed property name Chrome 47 Firefox 34 Safari 8
    // NodeList forEach Chrome 51 Firefox 50* Safari 10
    // isConnected Chrome 51 Firefox 49 Safari 10
    // replaceWith Chrome 54 Firefox 49 Safari 10
    // once Chrome 55* Firefox 50* Safari 10
    return "replaceWith" in doc.createElement("div");
  }

  static define() {
    if(!("customElements" in win)) {
      return;
    }

    win.customElements.define(this.tagName, this);
    win.Island = this;
  }

  static fallback = {
    // Support: computed property name Chrome 47 Firefox 34 Safari 8
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#browser_compatibility
    [`:not(${this.tagName}):not(:defined):not([${this.attr.defer}])`]: (readyPromise, node, prefix) => {
      // remove to prevent web component init
      let cloned = doc.createElement(prefix + node.localName);

      for(let attr of node.getAttributeNames()) {
        cloned.setAttribute(attr, node.getAttribute(attr));
      }

      // Declarative Shadow DOM (with polyfill)
      let shadowroot = node.shadowRoot;
      if(!shadowroot) {
        let tmpl = node.querySelector(":scope > template[shadowrootmode], :scope > template[shadowroot]");
        // Support: (optional) shadowroot Chrome 90–110
        // Support: (optional) shadowrootmode Chrome 111 Firefox 123 Safari 16.4
        if(tmpl) {
          let mode = tmpl.getAttribute("shadowrootmode") || tmpl.getAttribute("shadowroot") || "closed";
          shadowroot = node.attachShadow({ mode }); // default is closed
          shadowroot.appendChild(tmpl.content.cloneNode(true));
        }
      }

      // Cheers https://gist.github.com/developit/45c85e9be01e8c3f1a0ec073d600d01e
      if(shadowroot) {
        cloned.attachShadow({ mode: shadowroot.mode }).append(...shadowroot.childNodes);
      }

      // Keep *same* child nodes to preserve state of children (e.g. details->summary)
      // Support: spread Chrome 46 Firefox 16 Safari 8
      cloned.append(...node.childNodes);
      // Support: replaceWith Chrome 54 Firefox 49 Safari 10
      node.replaceWith(cloned);

      return readyPromise.then(() => {
        // Restore original children and shadow DOM
        if(cloned.shadowRoot) {
          node.shadowRoot.append(...cloned.shadowRoot.childNodes);
        }
        node.append(...cloned.childNodes);
        cloned.replaceWith(node);
      });
    }
  }

  constructor() {
    super();

    // Internal promises
    this.ready = new Promise(resolve => {
      this.readyResolve = resolve;
    });
  }

  // any parents of `el` that are <is-land> (with conditions)
  static getParents(el, stopAt = false) {
    let nodes = [];
    while(el) {
      if(el.matches && el.matches(this.tagName)) {
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

  static async ready(el, parents) {
    if(!parents) {
      parents = this.getParents(el);
    }
    if(parents.length === 0) {
      return;
    }
    let imports = await Promise.all(parents.map(p => p.wait()));
    // return innermost module import
    if(imports.length) {
      return imports[0];
    }
  }

  renameFallback() {
    if(win.Island) {
      Object.assign(Island.fallback, win.Island.fallback);
    }

    for(let selector in Island.fallback) {
      // Reverse for deepest nodes first
      let components = Array.from(this.querySelectorAll(selector)).reverse();

      // with thanks to https://gist.github.com/cowboy/938767
      for(let node of components) {
        // Support: isConnected Chrome 51 Firefox 49 Safari 10
        if(!node.isConnected) {
          continue;
        }

        let parents = Island.getParents(node);
        // must be in a leaf island (not nested deep)
        if(parents.length === 1) {
          let p = Island.ready(node, parents);
          Island.fallback[selector](p, node, Island.prefix);
        }
      }
    }
  }

  wait() {
    return this.ready;
  }

  async connectedCallback() {
    if(!Island.ctm()) {
      return;
    }

    // Only use fallback content when loading conditions in play
    if(Conditions.hasConditions(this)) {
      // Keep fallback content without initializing the components
      this.renameFallback();
    }

    await this.hydrate();
  }

  getTemplates() {
    return this.querySelectorAll(`template[${Island.attr.template}]`);
  }

  replaceTemplates(templates) {
    // replace <template> with the live content
    for(let node of templates) {
      // if the template is nested inside another child <is-land> inside, skip
      if(Island.getParents(node, this).length > 0) {
        continue;
      }

      let value = node.getAttribute(Island.attr.template);
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
          if(Island.onceCache.has(html)) {
            node.remove();
            return;
          }

          Island.onceCache.set(html, true);
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

    conditions.push(...Conditions.getConditions(this));

    // Loading conditions must finish before dependencies are loaded
    await Promise.all(conditions);

    this.replaceTemplates(this.getTemplates());

    for(let fn of Island.onReady.values()) {
      await fn.call(this, Island);
    }

    this.readyResolve();

    this.setAttribute(Island.attr.ready, "");

    // Support: NodeList forEach Chrome 51 Firefox 50 Safari 10
    let d = Island.attr.defer;
    this.querySelectorAll(`[${d}]`).forEach(n => n.removeAttribute(d));
  }
}

class Conditions {
  static _media = {}; // cache

  static map = {
    "on:visible": Conditions.visible,
    "on:idle": Conditions.idle,
    "on:load": Conditions.pageLoad,
    "on:interaction": Conditions.interaction,
    "on:media": Conditions.media,
    "on:save-data": Conditions.saveData,
  };

  static hasConditions(node) {
    for(let attr of Object.keys(Conditions.map)) {
      if(node.hasAttribute(attr)) {
        return true;
      }
    }
    return false;
  }

  // Support: Default param values Chrome 49 Firefox 15 Safari 10
  static getConditions(node) {
    let v = [];
    for(let attr of Object.keys(Conditions.map)) {
      if(node.hasAttribute(attr)) {
        let attrValue = node.getAttribute(attr);
        v.push(Conditions.map[attr](attrValue, node));
      }
    }

    return v;
  }

  static visible(noop, el) {
    let {promise, resolve} = resolvers();

    // Support: (optional) IntersectionObserver Chrome 58 Firefox 55 Safari 12.1
    if("IntersectionObserver" in win) {
      let observer = new IntersectionObserver(entries => {
        let [entry] = entries;
        if(entry.isIntersecting) {
          observer.unobserve(entry.target);
          resolve();
        }
      });

      observer.observe(el);
    } else {
      resolve();
    }

    return promise;
  }

  // Global (not element dependent)
  static pageLoad() {
    if(Conditions._cacheLoad) {
      return Conditions._cacheLoad;
    }

    let { promise, resolve } = resolvers();

    if(doc.readyState === "complete") {
      resolve();
    } else {
      // Support: once Chrome 55 Firefox 50 Safari 10
      win.addEventListener("load", () => resolve(), { once: true });
    }

    Conditions._cacheLoad = promise;

    return promise;
  }

  // Global (not element dependent)
  // TODO fix this to resolve *last* when used with other conditions
  static idle() {
    if(Conditions._cacheIdle) {
      return Conditions._cacheIdle;
    }

    let { promise, resolve } = resolvers();

    if("requestIdleCallback" in win) {
      requestIdleCallback(() => resolve());
    } else {
      resolve();
    }

    Conditions._cacheIdle = Promise.all([
      Conditions.pageLoad(), // idle *after* load
      promise,
    ]);

    return Conditions._cacheIdle;
  }

  static interaction(eventOverrides, el) {
    // event overrides e.g. on:interaction="mouseenter"
    let eventsStr = eventOverrides || "click,touchstart";
    let events = eventsStr.split(",").map(entry => entry.trim());

    let {promise, resolve} = resolvers();

    function resolveFn(e) {
      resolve();

      // cleanup the other event handlers
      for(let name of events) {
        el.removeEventListener(name, resolveFn);
      }
    }

    for(let name of events) {
      // Support: once Chrome 55 Firefox 50 Safari 10
      // Support: (optional) passive Chrome 51 Firefox 49 Safari 10
      el.addEventListener(name, resolveFn, { once: true, passive: true });
    }

    return promise;
  }

  // Global (viewport, not element dependent)
  static media(query) {
    if(Conditions._media[query]) {
      return Conditions._media[query];
    }

    let {promise, resolve} = resolvers();

    let mm = {
      matches: true
    };

    if(query && ("matchMedia" in win)) {
      mm = win.matchMedia(query);
    }

    if(mm.matches) {
      resolve();
    } else {
      mm.addListener(e => {
        if(e.matches) {
          resolve();
        }
      });
    }

    Conditions._media[query] = promise;

    return promise;
  }

  // Immediate
  static saveData(expects) {
    let {promise, resolve} = resolvers();

    // Support: (optional) saveData Chrome 65
    if(!("connection" in nav) || nav.connection.saveData === (expects !== "false")) {
      resolve();
    }

    return promise;
  }
}

Island.define();

export { Island };
