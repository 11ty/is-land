import { test, expect } from "vitest";
import { Island } from "../is-land.js";

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
