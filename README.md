# `<is-land>`

A framework independent partial hydration islands architecture implementation.

Features:

* Easy to add to existing components
* Zero dependencies by default
* Small footprint
* Not tightly coupled to a server framework or site generator tool.
* Server-rendering (SSR) component examples available for SSR-friendly frameworks (Lit, Svelte, Vue, Preact are provided)

Examples for

* [Web Components](demo.html)
* [Svelte](demo-svelte.html) (and SSR)
* [Vue (and petite-vue)](demo-vue.html) (and SSR)
* [Preact](demo-preact.html) (and SSR)
* [Lit](demo-lit.html) (and SSR)
* [Alpine.js](demo-alpine.html)
* _Experimental:_ [Image Loading](demo-image-loading.html)
* _Experimental:_ [Using import maps to simplify import URLs](demo-importmaps.html). This is for-future-reference when [browser support broadens](https://caniuse.com/import-maps).

## Installation

```
npm install @11ty/is-land
```

Add `islands.js` to your primary bundle. It can be deferred and/or loaded asynchronously.

When using with web components it must be the first custom element defined (via `customElements.define`) on the page. Choose your style:

```html
<script type="module" src="/islands.js"></script>
```

```html
<script type="module">
import "/island.js";
</script>
```

## Usage

```html
<is-land>This is an island.</is-land>
```

Add any number of loading conditions to this tag to control how and when the island is initialized. You can mix and match:

* `on:visible`
* `on:idle`
* `on:interaction` (defaults to `touchstart,click`)
  * Change events with `on:interaction="mouseenter,focusin"`
* `on:media`
  * Viewport size: `on:media="(min-width: 64em)"`
  * Reduced motion:
    * Opt-in with `on:media="(prefers-reduced-motion)"`
    * Opt-out with `on:media="(prefers-reduced-motion: no-preference)"`
* Save Data ([read about Save Data on MDN](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData))
  * Opt-in with `on:save-data`
  * Opt-out with `on:save-data="false"`


```html
<is-land on:visible on:idle>
  <!-- your HTML here -->

  <is-land on:media="(min-width: 64em)">
    <!-- Islands can be nested -->
    <!-- Islands inherit all of their parents’ loading conditions -->
  </is-land>
</is-land>
```

### Controlling Fallback Content

#### Pre-JS

```html
<is-land on:visible on:idle>
  <vanilla-web-component>
    Put your pre-JS fallback content in your web component.
  </vanilla-web-component>
</is-land>
```

#### Post-JS with `<template>`

Place any post-JS content inside of one or more `<template data-island>` elements anywhere in the `<is-land>`. These will be swapped with their template content. You can nest an `<is-land>` in there if you want!

```html
<is-land on:visible on:idle>
  <template data-island>
    <vanilla-web-component>
      This component is post-JS.
    </vanilla-web-component>
  </template>
</is-land>
```

#### Styling

The `ready` attribute is added to the `<is-land>` when the island has been hydrated.

```html
<style>
is-land[ready] {
  background-color: lightgreen;
}
</style>
```

#### Run your own custom JavaScript

This code runs when the island’s loading conditions have been satisfied! Note the `type="module/island"`.

```html
<script type="module/island">
console.log("Hydrating!");
</script>
```

### Framework Support

Demos with source code are available for each framework listed here.

#### `autoinit`

Use the `autoinit` and `import` attributes together to import a third party library (or component code). `autoinit` can be one of `petite-vue`, `vue`, `preact`, or `svelte`. It is recommended to use a self-hosted framework library (future Eleventy integrations will automate this for you).

```html
<is-land on:visible autoinit="petite-vue" import="https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.es.js" v-scope="{ name: 'post-JS' }">
  Hello from <span v-html="name">pre-JS</span>
</is-land>

<!-- when import maps support is better, this simplifies with an entry for petite-vue in your import map -->
<is-land on:visible import="petite-vue" v-scope="{ name: 'post-JS' }">
  Hello from <span v-html="name">pre-JS</span>
</is-land>
```

#### Petite Vue

* Small library (8K)
* Rendering modes: Client
* Progressive-enhancement friendly (full control of fallback content)
* Support for `autoinit`

```html
<is-land on:visible autoinit="petite-vue" import="https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.es.js" v-scope="{ name: 'post-JS' }">
  Hello from <span v-html="name">pre-JS</span>
</is-land>
```

#### Vue

* Larger library (51 kB)
* Rendering modes: Client-only, Server-only, Server + Client (Hydration)
* Support for `autoinit`

```html
<is-land on:visible>
  <div id="vue-app">
    Hello from <span v-html="name">pre-JS</span>
  </div>

  <script type="module/island">
    import { createApp } from "https://unpkg.com/vue@3.2.36/dist/vue.esm-browser.prod.js";

    createApp({
      data: () => ({ name: "post-JS" })
    }).mount("#vue-app")
  </script>
</is-land>
```

#### Svelte

* Smaller library (12 kB)
* Rendering modes: Client-only, Server-only, Server + Client (Hydration)
  * Requires a compiler for both client and server modes (tighter server coupling)
* Support for `autoinit`

This example uses [an Eleventy/Svelte integration](./11ty/SveltePlugin.cjs) to compile a Svelte component.

```html
{% assign component = "./lib/svelte/my-component.svelte" | svelte %}
<is-land on:visible autoinit="svelte" import="{{ component.clientJsUrl }}"></is-land>
```

<details>
  <summary>Example component code <code>./lib/svelte/my-component.svelte:</code></summary>

```html
<script>
  // using export to allow overrides via props
  export let name = 'world';

  let count = 0;

  function handleClick() {
    count += 1;
  }
</script>

<style>
  h1 { color: red }
</style>

<h1>Hello {name}</h1>

<button on:click={handleClick}>
  Clicked {count} {count === 1 ? 'time' : 'times'}
</button>
```

</details>

#### Preact

* Very small library (~5 kB)
* Rendering modes: Client-only, Server-only, Server + Client (Hydration)
* Support for `autoinit`

This example uses [`htm` instead of JSX](https://github.com/developit/htm).

```html
<is-land on:visible autoinit="preact" import="/lib/preact/preact-component.js"></is-land>
```

<details>
  <summary>Example component code <code>./lib/preact/preact-component.js</code>:</summary>

```js
import { html, render } from 'https://unpkg.com/htm/preact/index.mjs?module'

function App (props) {
  return html`<p><strong>Hello ${props.name}!</strong></p>`;
}

export default function(el) {
  render(html`<${App} name="from Preact" />`, el);
}
```

</details>

#### Lit

* Small library (~7 kB)
* Rendering modes: Client-only, Server + Client (Hydration)
  * Note: Server-only is not supported: it requires Declarative Shadow DOM support to work without JS.
* No support for `autoinit`

```html
<is-land on:visible import="./lib/lit/lit-component.js">
  <lit-component name="Post-JS">Pre-JS Content</lit-web-component>
</is-land>
```

<details>
  <summary>Example component code <code>./lib/lit/lit-component.js</code>:</summary>

```js
import {html, css, LitElement} from "https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js";

customElements.define('lit-component', class extends LitElement {
  static properties = {
    name: {type: String},
  };

  render() {
    return html`<p>Hello, ${this.name || "Stranger"}!</p>`;
  }
});
```

</details>

#### Alpine.js

* Smaller library (15 kB)
* Rendering modes: Client-only
* No `autoinit` but it is not needed (functionality included for-free by Alpine.js)

```html
<is-land on:visible import="https://unpkg.com/alpinejs">
  <div x-data="{ count: 0 }">
    Hello from Alpine.js!

    <button @click="count++">⬆️</button> <button @click="count--">⬇️</button> <span x-text="count"></span>
  </div>
</is-land>
```