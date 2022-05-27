// You _could_ use import maps here once browser support is better
import {html, css, LitElement} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

// All the app code goes here
// Taken from https://lit.dev/playground/#sample=examples/hello-world

customElements.define('lit-web-component', class extends LitElement {
  // encapsulated styles!
  static styles = css`p { color: blue; margin: 0; }`;

  static properties = {
    name: {type: String},
  };

  render() {
    this.classList.add("test-c-finish");
    return html`<p>Hello, ${this.name || "Stranger"}!</p>`;
  }
});