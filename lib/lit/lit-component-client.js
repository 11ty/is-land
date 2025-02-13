import {html, css, LitElement} from "lit";

customElements.define('lit-component-client', class extends LitElement {
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