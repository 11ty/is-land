import {createSignal} from "https://esm.sh/solid-js@1.8.16";
import html from "https://esm.sh/solid-js@1.8.16/html";
import { customElement } from "https://esm.sh/solid-element@1.8.0";

customElement('solid-component-client', { name: undefined },

  /**
    * @param {{name: string | undefined}} props
    * @param {{element: HTMLElement}} input
    */
  (props, { element }) => {
    element.classList.add("test-c-finish");
    const [count, setCount] = createSignal(0);
    return html`
<style>
p { color: blue; margin: 0 }
</style>
<p>Hello, ${() => props.name || "Stranger"}!</p>
<div>
<button onclick=${() => setCount(count() + 1)} >Increment</button>
Counter: ${count}
</div>
`;
  });

