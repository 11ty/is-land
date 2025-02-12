class IslandAutoinit {
	static attr = {
		autoInitType: "autoinit",
		import: "import",
	}

	static types = {
		"petite-vue": function(lib) {
			lib.createApp().mount(this);
		},
		"vue": function(lib) {
			lib.createApp().mount(this);
		},
		"svelte": async function(lib) {
			// requires an Import map!
			const { mount } = await import("svelte");
			mount(lib.default, {
				target: this,
				props: {},
			});
		},
		"svelte-ssr": async function(lib) {
			// requires an Import map!
			const { hydrate } = await import("svelte");
			hydrate(lib.default, {
				target: this,
				props: {},
			})
		},
		"preact": function(lib) {
			lib.default(this);
		}
	};
}

Island.onReady.set("import-autoinit", async function(Island) {
	let mod;
  // [import="my-component-code.js"]
  let importScript = this.getAttribute(IslandAutoinit.attr.import);
  if(importScript) {
    // we could resolve import maps here manually but you’d still have to use the full URL in your script’s import anyway
    mod = await import(importScript);
  }

  if(mod) {
		// [autoinit="petite-vue"][import="my-component-code.js"]
		// [autoinit][import="petite-vue"] (where petite-vue has an import map mapping)
		let autoInitValue = this.getAttribute(IslandAutoinit.attr.autoInitType);
    // `import=""` works with import maps e.g. `import="petite-vue"`
    let fn = IslandAutoinit.types[autoInitValue || importScript];
    if(fn) {
      await fn.call(this, mod);
    }
  }
})