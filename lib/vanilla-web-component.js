// Programmatic usage
// import { ready } from "/is-land.js";

class VanillaWebComponent extends HTMLElement {
  async connectedCallback() {
    // Programmatic API: waiting to lazy load
    // await ready(this);

    // ready to go
    this.classList.add("test-c-finish");
  }
}

if("customElements" in window) {
  customElements.define("vanilla-web-component", VanillaWebComponent);
}