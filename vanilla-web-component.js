import { ready } from "@11ty/island";

class MyWebComponent extends HTMLElement {
  async connectedCallback() {
    // waiting to lazy load
    await ready(this);

    // ready to go
    this.classList.add("test-c-finish");
  }
}

if("customElements" in window) {
  customElements.define("vanilla-web-component", MyWebComponent);
}