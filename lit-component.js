// script="./lit-component.js" expects an async function back and passes in imports as argument
export default async function({html, css, LitElement}) {
  // All the app code goes here
  // Taken from https://lit.dev/playground/#sample=examples/hello-world

  customElements.define('lit-web-component', class extends LitElement {
    // encapsulated styles!
    static styles = css`p { color: blue }`;
  
    static properties = {
      name: {type: String},
    };

    render() {
      this.classList.add("test-c-finish");
      return html`<p>Hello, ${this.name || "Stranger"}!</p>`;
    }
  });
}