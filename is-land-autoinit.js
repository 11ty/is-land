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
		"svelte": function(lib) {
			new lib.default({ target: this });
		},
		"svelte-ssr": function(lib) {
			new lib.default({ target: this, hydrate: true });
		},
		"preact": function(lib) {
			lib.default(this);
		}
	};
}

Island.onReady.set("import-autoinit", async function(Island) {
	let mod;
  // [dependency="my-component-code.js"]
  let importScript = this.getAttribute(IslandAutoinit.attr.import);
  if(importScript) {
    // we could resolve import maps here manually but you’d still have to use the full URL in your script’s import anyway
    mod = await import(importScript);
  }

  if(mod) {
    // Use `import=""` for when import maps are available e.g. `import="petite-vue"`
    let fn = IslandAutoinit.types[this.getAttribute(IslandAutoinit.attr.autoInitType) || importScript];
    if(fn) {
      await fn.call(this, mod);
    }
  }
})