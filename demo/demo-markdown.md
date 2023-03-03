---
layout: layout.html
title: Islands in Markdown
showPageCss: true
---
# [is-land](/) Embedded in <img src="https://v1.indieweb-avatar.11ty.dev/https%3A%2F%2Fwww.markdownguide.org%2F/" alt="IndieWeb avatar for https://www.markdownguide.org/" width="28" height="28" decoding="async" loading="lazy"> Markdown

# Header

This is a sample paragraph.

```
Some code
```

## Scroll down

<hr style="height: 100vh">

This is a sample paragraph.

```
Some code
```

## Svelte (SSR) Component

{% assign component = "./lib/svelte/my-component.svelte" | svelte: page.url %}

<is-land on:visible autoinit="svelte-ssr" import="{{ component.clientJsUrl }}">{{ component.html }}</is-land>

## Here is another header.