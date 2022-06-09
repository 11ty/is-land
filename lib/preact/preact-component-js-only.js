import { html, render } from 'https://unpkg.com/htm/preact/index.mjs?module'

function App (props) {
  return html`<p><strong>Hello ${props.name}!</strong></p>`;
}

export default function(el) {
  render(html`<${App} name="from Preact" />`, el);
}