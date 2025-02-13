import {createSignal} from "solid-js";
import html from "solid-js/html";
import { customElement } from "solid-element";

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

