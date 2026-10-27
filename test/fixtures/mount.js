export default function(el) {
  let calls = window.__mountCalls || (window.__mountCalls = []);
  calls.push({ el, hasChild: el.querySelector("x-foo") !== null, ready: el.hasAttribute("ready") });
  return window.__mountPromise;
}
