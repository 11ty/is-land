class ChocolateWebComponent extends HTMLElement {
  async connectedCallback() {
    this.init();
  }

  init() {
    if(this.hasAttribute("defer-hydration")) {
      return;
    }

    this.classList.add("test-c-finish");
  }

  // when this *defines* it triggers an attribute change on defer-hydration from null => ""
  static get observedAttributes() {
    return ["defer-hydration"];
  }

  attributeChangedCallback(name, previousValue, newValue) {
    if(name ==="defer-hydration" && newValue === null) {
      this.init();
    }
  }
}

if("customElements" in window) {
  customElements.define("chocolate-web-component", ChocolateWebComponent);
}