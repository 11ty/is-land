# `<is-land>`

A new performance-focused way to add interactive client-side components to your web site.

Or, more technically: a framework independent partial hydration islands architecture implementation.

* View the [demos](https://is-land.11ty.dev/)
* Check out the [initial screencast on Eleventy’s YouTube channel](https://youtu.be/YYJpFdEaAuc?t=188) and [the follow up screencast with more framework examples](https://www.youtube.com/watch?v=V9hWgVV_5mg).
* [Learn more about Islands Architecture](https://jasonformat.com/islands-architecture/)

Features:

* Easy to add to existing components
* Zero dependencies
* Not tightly coupled to a server framework or site generator tool.
* Small footprint (5 kB minimized; 1.61 kB with Brotli compression)
* Server-rendered (SSR) component examples available for SSR-friendly frameworks (Lit, Svelte, Vue, Preact are provided)

Examples for:

* [Web Components](./index.html)
* [Web Components using Declarative Shadow DOM](./demo-declarative-shadow-dom.html) _(New in v3.0.0)_
* [Svelte](./demo-svelte.html) (and SSR)
* [Vue (and petite-vue)](./demo-vue.html) (and SSR)
* [Preact](./demo-preact.html) (and SSR)
* [Lit](./demo-lit.html) (and SSR)
* [Alpine.js](./demo-alpine.html)
* [Embedded in Markdown](./demo-markdown.md)
* [`defer-hydration` Component Attribute Support](./demo-defer-hydration.html) _(New in v3.0.0)_ ([Read more about `defer-hydration` at zachleat.com](https://www.zachleat.com/web/defer-hydration/))
* _Experimental:_ [Image Loading](./demo-image-loading.html)
* _Experimental:_ [Using import maps to simplify import URLs](./demo-importmaps.html). This is for-future-reference when [browser support broadens](https://caniuse.com/import-maps).

Integrations in the wild:

* [Eleventy](https://is-land.11ty.dev/)
* [WebC](https://demo-webc-image-compare.netlify.app)
* [Slinkity](https://twitter.com/slinkitydotdev/status/1544322804774064133)
* [SvelteKit](https://twitter.com/geoffrich_/status/1576932300960342018)
* [Bridgetown](https://twitter.com/jaredcwhite/status/1585433466770173953)
* [Lit](https://twitter.com/techytacos/status/1590248099297259520)

## Installation

```
npm install @11ty/is-land
```

Add `is-land.js` to your primary bundle. It can be deferred and/or loaded asynchronously.

When using with web components it must be the first custom element defined (via `customElements.define`) on the page. Choose your style:

```html
<script type="module" src="/is-land.js"></script>
```

```html
<script type="module">
import "/is-land.js";
</script>
```

The framework `autoinit` examples shown below now require a separate `is-land-autoinit.js` file too.

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

* Use `data-island="replace"` to replace the contents of the `<is-land>` with the template.
* Use `data-island="once"` to run a template’s contents once per page (keyed from template contents). _(New in v2.0.1)_

#### Run your own custom JavaScript, load your own CSS

Embed a script inside the template to run custom JS when the island’s loading conditions have been satisfied!

```html
<is-land on:visible>
  <template data-island>
    <!-- CSS -->
    <style>/* My custom CSS */</style>
    <link rel="stylesheet" href="my-css-file.css">

    <!-- JS -->
    <script type="module">console.log("Hydrating!");</script>
    <script type="module" src="my-js-file.js"></script>
  </template>
</is-land>
```

You can also use the `ready` attribute for styling, added to the `<is-land>` when the island has been hydrated.

```html
<style>
is-land[ready] {
  background-color: lightgreen;
}
</style>
```

### Framework Support

[Demos and source in the HTML](https://is-land.11ty.dev/) are available for each framework listed here. These examples require the `is-land-autoinit.js` JavaScript file (in addition to `is-land.js`).

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

  <template data-island>
    <script type="module">
    import { createApp } from "https://unpkg.com/vue@3.2.36/dist/vue.esm-browser.prod.js";

    createApp({
      data: () => ({ name: "post-JS" })
    }).mount("#vue-app")
    </script>
  </template>
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
