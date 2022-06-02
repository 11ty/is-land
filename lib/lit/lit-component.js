import {LitElement, html, css} from 'lit';

class LitComponent extends LitElement {
  static styles = css`
    button:not(:defined) { display: none; }
    b { color: blue; }
  `;

  static properties = {
    name: {},
    count: {
      type: Number
    },
  };

  constructor() {
    super();
    this.count = 0;
  }

  render() {
    return html`
Hello <b>${this.name}</b>!
<button @click="${this.onIncrement}">⬆️</button>
<button @click="${this.onDecrement}">⬇️</button>
${this.count}
`;
  }

  onIncrement(e) {
    this.count++;
  }

  onDecrement(e) {
    this.count--;
  }
}

customElements.define('lit-component', LitComponent);