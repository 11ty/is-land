import { test, expect, vi } from "vitest";
import { Island } from "../is-land.js";

test("Fallback elements are restored before init types run", async () => {
  let found;
  let { promise, resolve } = Promise.withResolvers();
  Island.addInitType("check", (target) => {
    found = target.querySelector("x-foo") !== null;
    resolve();
  });

  document.body.innerHTML = `<is-land on:interaction type="check"><x-foo>Hi</x-foo></is-land>`;
  let island = document.querySelector("is-land");
  expect(island.querySelector("is-land--x-foo")).not.toBeNull();

  island.dispatchEvent(new Event("click"));
  await promise;

  expect(found).toBe(true);
});

test("Islands without conditions hydrate immediately", async () => {
  document.body.innerHTML = `<is-land></is-land>`;
  let island = document.querySelector("is-land");
  await island.wait();

  expect(island.hasAttribute("ready")).toBe(true);
});

test("on:interaction waits for an event", async () => {
  document.body.innerHTML = `<is-land on:interaction="mouseenter"><x-bar></x-bar></is-land>`;
  let island = document.querySelector("is-land");

  island.dispatchEvent(new Event("click"));
  await new Promise(r => setTimeout(r, 20));
  expect(island.hasAttribute("ready")).toBe(false);
  expect(island.querySelector("is-land--x-bar")).not.toBeNull();

  island.dispatchEvent(new Event("mouseenter"));
  await island.wait();
  expect(island.hasAttribute("ready")).toBe(true);
  expect(island.querySelector("x-bar")).not.toBeNull();
});

test("on:media does not hydrate when the query does not match", async () => {
  document.body.innerHTML = `<is-land on:media="(min-width: 100000px)"></is-land>`;
  let island = document.querySelector("is-land");
  await new Promise(r => setTimeout(r, 20));

  expect(island.hasAttribute("ready")).toBe(false);
});

test("Templates are rendered on hydration", async () => {
  document.body.innerHTML = `<is-land on:interaction><p>Before</p><template data-island><p id="a">A</p></template><template data-island="replace"><p id="b">B</p></template></is-land>`;
  let island = document.querySelector("is-land");
  expect(island.querySelector("#b")).toBeNull();

  island.dispatchEvent(new Event("click"));
  await island.wait();

  expect(island.querySelector("#b")).not.toBeNull();
  expect(island.textContent).not.toContain("Before");
  expect(island.querySelector("template")).toBeNull();
});

test("Nested islands wait for their parent", async () => {
  document.body.innerHTML = `<is-land on:interaction id="parent"><is-land id="child"></is-land></is-land>`;
  let parent = document.querySelector("#parent");
  let child = document.querySelector("#child");
  await new Promise(r => setTimeout(r, 20));
  expect(child.hasAttribute("ready")).toBe(false);

  parent.dispatchEvent(new Event("click"));
  await child.wait();
  expect(child.hasAttribute("ready")).toBe(true);
});

test("defer-hydration attributes are removed on hydration", async () => {
  document.body.innerHTML = `<is-land on:interaction><x-baz defer-hydration></x-baz></is-land>`;
  let island = document.querySelector("is-land");
  expect(island.querySelector("x-baz[defer-hydration]")).not.toBeNull();

  island.dispatchEvent(new Event("click"));
  await island.wait();
  expect(island.querySelector("x-baz[defer-hydration]")).toBeNull();
});

test("setSwapBehavior wraps the hydration DOM swap in a view transition", async () => {
  let original = Island._swapFn;
  let transition;
  let received;
  Island.setSwapBehavior((swap, island) => {
    received = island;
    transition = document.startViewTransition(swap);
  });

  try {
    document.body.innerHTML = `<is-land on:interaction><p>Before</p><template data-island="replace"><p id="vt">After</p></template></is-land>`;
    let island = document.querySelector("is-land");

    island.dispatchEvent(new Event("click"));
    await island.wait();

    expect(received).toBe(island);
    expect(island.querySelector("#vt")).not.toBeNull();
    expect(island.textContent).not.toContain("Before");
    await transition.finished;
  } finally {
    Island.setSwapBehavior(original);
  }
});

test("Programmatic API resolves loading conditions", async () => {
  document.body.innerHTML = `<div id="target">Hi</div>`;
  let el = document.querySelector("#target");

  await Island.onload();
  await Island.onidle();
  await Island.onvisible(el);
  await Island.onmedia("(min-width: 1px)");

  let clicked = false;
  let interaction = Island.oninteraction(el, "mouseenter").then(() => clicked = true);
  el.dispatchEvent(new Event("click"));
  await new Promise(r => setTimeout(r, 20));
  expect(clicked).toBe(false);

  el.dispatchEvent(new Event("mouseenter"));
  await interaction;
  expect(clicked).toBe(true);
});

const mountUrl = new URL("./fixtures/mount.js", import.meta.url).href;

test("import-mount calls the default export with the island after swap and before ready", async () => {
  window.__mountCalls = [];
  window.__mountPromise = undefined;
  document.body.innerHTML = `<is-land on:interaction import="${mountUrl}" import-mount><x-foo>Hi</x-foo></is-land>`;
  let island = document.querySelector("is-land");
  expect(island.querySelector("is-land--x-foo")).not.toBeNull();

  island.dispatchEvent(new Event("click"));
  await island.wait();

  expect(window.__mountCalls).toHaveLength(1);
  let [call] = window.__mountCalls;
  expect(call.el).toBe(island);
  expect(call.hasChild).toBe(true);
  expect(call.ready).toBe(false);
  expect(island.querySelector("is-land--x-foo")).toBeNull();
});

test("import-mount awaits a returned promise before ready", async () => {
  let { promise, resolve } = Promise.withResolvers();
  window.__mountCalls = [];
  window.__mountPromise = promise;
  document.body.innerHTML = `<is-land on:interaction import="${mountUrl}" import-mount></is-land>`;
  let island = document.querySelector("is-land");

  island.dispatchEvent(new Event("click"));
  await vi.waitFor(() => expect(window.__mountCalls).toHaveLength(1));
  await new Promise(r => setTimeout(r, 20));
  expect(island.hasAttribute("ready")).toBe(false);

  resolve();
  await island.wait();
  expect(island.hasAttribute("ready")).toBe(true);
  window.__mountPromise = undefined;
});

test("import without import-mount does not call the default export", async () => {
  window.__mountCalls = [];
  document.body.innerHTML = `<is-land import="${mountUrl}"></is-land>`;
  let island = document.querySelector("is-land");
  await island.wait();

  expect(island.hasAttribute("ready")).toBe(true);
  expect(window.__mountCalls).toHaveLength(0);
});

test("import-mount throws with the module URL when the default export is not a function", async () => {
  let url = new URL("./fixtures/mount-invalid.js", import.meta.url).href;
  let el = document.createElement("div");
  el.setAttribute("import", url);
  el.setAttribute("import-mount", "");

  await expect(Island._initTypes.default(el)).rejects.toThrow(url);
});

test("on:visible passes its value as rootMargin to the IntersectionObserver", async () => {
  let Original = window.IntersectionObserver;
  let options = [];
  window.IntersectionObserver = class extends Original {
    constructor(cb, opts) {
      options.push(opts);
      super(cb, opts);
    }
  };

  try {
    document.body.innerHTML = `<is-land on:visible="200px 0px"></is-land><is-land on:visible></is-land>`;
    let [a, b] = document.querySelectorAll("is-land");
    await Promise.all([a.wait(), b.wait()]);

    expect(options).toEqual([{ rootMargin: "200px 0px" }, undefined]);
  } finally {
    window.IntersectionObserver = Original;
  }
});

test("on:idle passes its value as timeout to requestIdleCallback", async () => {
  let spy = vi.spyOn(window, "requestIdleCallback");

  try {
    document.body.innerHTML = `<is-land on:idle="1234"></is-land>`;
    await document.querySelector("is-land").wait();

    expect(spy).toHaveBeenCalledWith(expect.any(Function), { timeout: 1234 });
  } finally {
    spy.mockRestore();
  }
});

test("on:idle with different timeouts on one page each get their own timeout", async () => {
  let spy = vi.spyOn(window, "requestIdleCallback");

  try {
    document.body.innerHTML = `<is-land on:idle="1111"></is-land><is-land on:idle="2222"></is-land><is-land on:idle="nope"></is-land>`;
    await Promise.all([...document.querySelectorAll("is-land")].map(el => el.wait()));

    let timeouts = spy.mock.calls.map(([, opts]) => opts?.timeout);
    expect(timeouts).toContain(1111);
    expect(timeouts).toContain(2222);
    expect(timeouts).not.toContain(NaN);
  } finally {
    spy.mockRestore();
  }
});
