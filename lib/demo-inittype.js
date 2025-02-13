Island.addInitType("svelte", async (target) => {
	// requires an Import map and svelte is lazy loaded when island is ready
	const { mount } = await import("svelte");
	const component = await import(target.getAttribute("import"));

	mount(component.default, {
		target: target,
		props: {},
	});
});

Island.addInitType("svelte-ssr", async (target) => {
	// requires an Import map and svelte is lazy loaded when island is ready
	const { hydrate } = await import("svelte");
	const component = await import(target.getAttribute("import"));

	hydrate(component.default, {
		target: target,
		props: {},
	})
});

Island.addInitType("petite-vue", async (target) => {
	const { createApp } = await import("https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.es.js");
	createApp().mount(target);
});

Island.addInitType("vue", async (target) => {
	// const { createApp } = await import("https://unpkg.com/vue@3.5.13/dist/vue.esm-browser.prod.js");
	const { createApp } = await import("https://unpkg.com/vue@3.5.13/dist/vue.esm-browser.js");
	createApp({
		data: () => (target.dataset),
	}).mount(target);
});

Island.addInitType("vue-ssr", async (target) => {
	// const { createSSRApp } = await import("https://unpkg.com/vue@3.5.13/dist/vue.esm-browser.prod.js");
	const { createSSRApp } = await import("https://unpkg.com/vue@3.5.13/dist/vue.esm-browser.js");
	let component = await import(target.getAttribute("import"));
	createSSRApp(component.default).mount(target);
});

Island.addInitType("preact", async (target) => {
	const component = await import(target.getAttribute("import"));
	component.default(target);
});

Island.addInitType("preact-ssr", async (target) => {
	const { render } = await import("https://unpkg.com/htm/preact/index.mjs?module");
	const component = await import(target.getAttribute("import"));
	render(component.default(), target);
});

Island.addFallback("[x-data]", (readyPromise, node) => {
  if(node.hasAttribute("x-ignore")) {
    return;
  }

  node.setAttribute("x-ignore", "");

  return readyPromise.then(() => {
    node.removeAttribute("x-ignore");

    if(Alpine) {
      Alpine.nextTick(() => Alpine.initTree(node));
    }
  });
});

Island.addInitType("alpine", async (target) => {
	await import("https://unpkg.com/alpinejs@3.14.8/dist/cdn.min.js");
});