import { html } from 'htm/preact';

function App (props) {
  return html`<p><strong>Hello ${props.name}!</strong></p>`;
}

export default function(props) {
  return html`<${App} name="from Preact"/>`;
}