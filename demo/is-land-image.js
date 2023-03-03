function lazyLoadImage(readyPromise, node, prefix) {
	let attr = prefix + "img-skeleton";
	let template = node;
	if(node.tagName === "NOSCRIPT") {
		template = document.createElement("template");
		template.innerHTML = node.innerText;
	}
	if(template.tagName !== "TEMPLATE") {
		throw new Error("[data-island-img-skeleton] expects a <noscript> for No-JS images or a <template> for JS-only images.");
	}
	let templateContent = template.content;

	let images = templateContent.querySelectorAll("img");
	let promises = [];
	for(let img of images) {
		// remove
		img.setAttribute(attr, img.getAttribute("src"));
		img.setAttribute("src", `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>`);

		promises.push(readyPromise.then(() => {
			// restore
			img.setAttribute("src", img.getAttribute(attr));
			img.removeAttribute(attr);
		}));
	}

	node.replaceWith(templateContent);

	return Promise.all(promises);
}

// Experimental Fallback Plugin API
window.Island = {
	// Add custom fallback behavior, keys here are CSS selectors
	fallback: {
		"[data-island-img-skeleton]": lazyLoadImage
	}
};