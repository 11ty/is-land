import { test, expect, beforeAll } from "vitest";
import { page } from "vitest/browser";
import "../is-land.js";

// Mirrors demo/demo-stress-test-nest.html, in its own file because media conditions are cached per page.
const COUNT = 100;
const NARROW = "(max-width: 800px)";
const WIDE = "(min-width: 1200px)";

let connected = 0;

function sleep(ms = 50) {
	return new Promise(r => setTimeout(r, ms));
}

function get(selector) {
	return Array.from(document.querySelectorAll(selector));
}

let outer = () => get(`body > is-land[on\\:media="${NARROW}"]`);
let middle = () => get(`is-land[on\\:media="${NARROW}"] > is-land`);
let inner = () => get(`is-land[on\\:media="${WIDE}"] > is-land[on\\:interaction]`);
let sibling = () => get(`body > is-land[on\\:media="${WIDE}"]`);

let isVisible = el => {
	let r = el.getBoundingClientRect();
	return r.bottom > 0 && r.top < window.innerHeight;
};

beforeAll(async () => {
	await page.viewport(600, 600);

	let html = `<style>.island { display: block; min-height: 4em; padding: .5em; }</style>`;
	for(let j = 0; j < COUNT; j++) {
		html += `<is-land on:visible on:media="${NARROW}" class="island">
	<div>&lt;800px</div>
	<is-land on:visible on:media="${WIDE}" class="island">
		<div>&gt;1200px</div>
		<is-land on:visible on:interaction class="island">
			<button>click</button>
			<test-element>&lt;test-element&gt;</test-element>
		</is-land>
	</is-land>
</is-land>
<is-land on:visible on:media="${WIDE}" class="island">
	<test-element>&gt;1200px</test-element>
</is-land>`;
	}
	document.body.innerHTML = html;

	customElements.define("test-element", class extends HTMLElement {
		connectedCallback() {
			connected++;
		}
	});
});

test("Nested <test-element> are renamed and not initialized before hydration", () => {
	expect(get("test-element")).toHaveLength(0);
	expect(get("is-land--test-element")).toHaveLength(COUNT * 2);
	expect(connected).toBe(0);
});

test("Narrow viewport hydrates only visible outer islands", async () => {
	let visible = outer().filter(isVisible);
	expect(visible.length).toBeGreaterThan(0);
	await Promise.all(visible.map(el => el.wait()));
	await sleep();

	for(let el of outer()) {
		expect(el.hasAttribute("ready")).toBe(isVisible(el));
	}
	expect(outer().at(-1).hasAttribute("ready")).toBe(false);
	expect(get("is-land[ready]")).toHaveLength(visible.length);
	expect(connected).toBe(0);
});

test("Scrolling an outer island into view hydrates it", async () => {
	let last = outer().at(-1);
	last.scrollIntoView();
	await last.wait();
	expect(last.hasAttribute("ready")).toBe(true);
	window.scrollTo(0, 0);
});

test("Wide viewport hydrates middle islands of hydrated parents and the sibling islands", async () => {
	await page.viewport(1300, 600);
	await sleep();

	let hydratedMiddle = middle().filter(el => el.parentNode.hasAttribute("ready") && isVisible(el));
	expect(hydratedMiddle.length).toBeGreaterThan(0);
	await Promise.all(hydratedMiddle.map(el => el.wait()));

	for(let el of middle()) {
		if(!el.parentNode.hasAttribute("ready")) {
			expect(el.hasAttribute("ready")).toBe(false);
		}
	}

	let visibleSiblings = sibling().filter(isVisible);
	expect(visibleSiblings.length).toBeGreaterThan(0);
	await Promise.all(visibleSiblings.map(el => el.wait()));
	for(let el of visibleSiblings) {
		expect(el.querySelector(":scope > test-element:defined")).not.toBeNull();
	}

	// Innermost islands still wait for interaction
	expect(get("is-land[on\\:interaction][ready]")).toHaveLength(0);
	// Siblings seen earlier (narrow or scrolled) also hydrate once the media query matches
	let readySiblings = sibling().filter(el => el.hasAttribute("ready"));
	expect(readySiblings.length).toBeGreaterThanOrEqual(visibleSiblings.length);
	expect(connected).toBe(readySiblings.length);
});

test("Clicking hydrates the innermost island and initializes its <test-element>", async () => {
	let before = connected;
	let target = inner().find(el => el.parentNode.hasAttribute("ready") && isVisible(el));
	expect(target).toBeDefined();

	await page.elementLocator(target.querySelector("button")).click();
	await target.wait();

	expect(target.querySelector(":scope > test-element:defined")).not.toBeNull();
	expect(target.querySelector("is-land--test-element")).toBeNull();
	expect(connected).toBe(before + 1);
	expect(get("is-land[on\\:interaction][ready]")).toHaveLength(1);
});

test("Clicking an innermost island with an unhydrated ancestor does not hydrate it", async () => {
	let target = inner().find(el => !el.parentNode.parentNode.hasAttribute("ready"));
	expect(target).toBeDefined();

	target.dispatchEvent(new Event("click"));
	await sleep();

	expect(target.hasAttribute("ready")).toBe(false);
	expect(target.querySelector("is-land--test-element")).not.toBeNull();
});
