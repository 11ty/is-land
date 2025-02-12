//! <is-land> v5.0.0

const win = window;
const doc = win.document;
const nav = win.navigator;

function resolvers() {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/withResolvers
  let resolve, reject;
  let promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

class Island extends HTMLElement {
  static tagName = "is-land";
  static prefix = `${this.tagName}--`;

  static attr = {
    template: "data-island",
    ready: "ready",
    defer: "defer-hydration",
  };

  static onReady = new Map();
  static _onceCache = new Map();

  static ctm() {
    // Browser Support:
    // replaceWith Chrome 54 Firefox 49 Safari 10
    // Object.entries Chrome 54 Firefox 47 Safari 10.1
    // NodeList forEach Chrome 51 Firefox 50** Safari 10
    // once Chrome 55** Firefox 50** Safari 10
    return "entries" in Object && "replaceWith" in doc.createElement("div");
  }

  static define() {
    if("customElements" in win) {
      win.customElements.define(this.tagName, this);
    }
  }

  static fallback = {
    // Support: computed property name Chrome 47 Firefox 34 Safari 8
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Object_initializer#browser_compatibility
    [`:not(:defined):not(${this.tagName}):not([${this.attr.defer}])`]: (readyPromise, node, prefix) => {

      let cloned = Island.renameNode(node, prefix + node.localName);

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

    this._ready = resolvers();
  }

  static renameNode(node, name) {
    // rename (localName is readonly) to prevent custom element init
    let cloned = doc.createElement(name);

    for(let attr of node.getAttributeNames()) {
      cloned.setAttribute(attr, node.getAttribute(attr));
    }

    // Declarative Shadow DOM (with polyfill)
    let sr = node.shadowRoot;
    if(!sr) {
      let tmpl = node.querySelector(":scope > template[shadowrootmode], :scope > template[shadowroot]");
      // Support: (optional) shadowroot Chrome 90–110
      // Support: (optional) shadowrootmode Chrome 111 Firefox 123 Safari 16.4
      if(tmpl) {
        let mode = tmpl.getAttribute("shadowrootmode") || tmpl.getAttribute("shadowroot") || "closed";
        sr = node.attachShadow({ mode }); // default is closed
        sr.appendChild(tmpl.content.cloneNode(true));
      }
    }

    if(sr) {
      // Cheers https://gist.github.com/developit/45c85e9be01e8c3f1a0ec073d600d01e
      cloned.attachShadow({ mode: sr.mode }).append(...sr.childNodes);
    }

    // Keep *same* child nodes to preserve state of children (e.g. details->summary)
    // Support: spread Chrome 46 Firefox 16 Safari 8
    cloned.append(...node.childNodes);

    // Support: replaceWith Chrome 54 Firefox 49 Safari 10
    node.replaceWith(cloned);

    return cloned;
  }

  // any parents of `el` that are <is-land> with on: conditions
  static getParents(el, stopAt = false) {
    let nodes = [];
    while(el = el.parentNode) {
      if(!el || el === doc.body) {
          break;
      } else if(el.matches && el.matches(this.tagName)) { // Support: matches Chrome 33 Firefox 34 Safari 8
        if(stopAt && el === stopAt) {
          break;
        }

        if(Conditions.hasConditions(el)) {
          nodes.push(el);
        }
      }
    }
    return nodes;
  }

  replaceTemplates() {
    let templates = this.querySelectorAll(`template[${Island.attr.template}]`);

    // replace <template> with template content
    for(let tmpl of templates) {
      // if the template is nested inside another child <is-land> inside, skip
      if(Island.getParents(tmpl, this).length > 0) {
        continue;
      }

      let value = tmpl.getAttribute(Island.attr.template);
      // get rid of the rest of the content on the island
      if(value === "replace") {
        let children = Array.from(this.childNodes);
        for(let child of children) {
          this.removeChild(child);
        }
        this.appendChild(tmpl.content);
        break;
      } else {
        let html = tmpl.innerHTML;
        if(value === "once" && html) {
          if(Island._onceCache.has(html)) {
            tmpl.remove();
            return;
          }

          Island._onceCache.set(html, true);
        }

        tmpl.replaceWith(tmpl.content);
      }
    }
  }

  // resolves when all parent islands of node are ready
  static async ready(node, parents) {
    if(!Array.isArray(parents)) {
      parents = Island.getParents(node);
    }
    return Promise.all(parents.map(p => p.wait()));
  }

  replaceFallbackContent() {
    // Support: Object.entries Chrome 54 Firefox 47 Safari 10.1
    for(let [selector, fn] of Object.entries(Island.fallback)) {
      // Reverse for deepest nodes first
      let components = Array.from(this.querySelectorAll(selector)).reverse();

      // with thanks to https://gist.github.com/cowboy/938767
      for(let node of components) {
        // Support: isConnected Chrome 51 Firefox 49 Safari 10
        if(!node.isConnected) {
          continue;
        }

        let parents = Island.getParents(node);
        // only fallback if this is the closest island parent.
        if(parents[0] === this) {
          // wait for all parent islands
          let ready = Island.ready(node, parents);
          fn(ready, node, Island.prefix);
        }
      }
    }
  }

  wait() {
    return this._ready.promise;
  }

  async connectedCallback() {
    if(!Island.ctm()) {
      return;
    }

    // Only use fallback content when loading conditions in play
    if(Conditions.hasConditions(this)) {
      // Keep fallback content without initializing the components
      this.replaceFallbackContent();
    }

    await this.hydrate();
  }

  async hydrate() {
    let conditions = [];

    // TODO can we get rid of this?
    // if(this.parentNode) {
    //   // wait for all parents before hydrating
    //   conditions.push(Island.ready(this.parentNode));
    // }

    conditions.push(...Conditions.getConditions(this));

    // Loading conditions must finish before dependencies are loaded
    await Promise.all(conditions);

    this.replaceTemplates();

    for(let fn of Island.onReady.values()) {
      await fn.call(this, Island);
    }

    this._ready.resolve();

    let { ready, defer } = Island.attr;
    this.setAttribute(ready, "");
    // Support: NodeList forEach Chrome 51 Firefox 50 Safari 10
    this.querySelectorAll(`[${defer}]`).forEach(n => n.removeAttribute(defer));
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
    let { promise, resolve } = resolvers();

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

    let { promise, resolve } = resolvers();

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

    let { promise, resolve } = resolvers();

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
    let { promise, resolve } = resolvers();

    // Support: (optional) saveData Chrome 65
    if(!("connection" in nav) || nav.connection.saveData === (expects !== "false")) {
      resolve();
    }

    return promise;
  }
}

if(win.Island) {
  Object.assign(Island.fallback, win.Island.fallback);
}
win.Island = Island;

Island.define();

export { Island };
