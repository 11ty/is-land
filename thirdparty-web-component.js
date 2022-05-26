class PretendThirdParty extends HTMLElement {
  async connectedCallback() {
    // ready to go
    this.classList.add("test-c-finish");
  }
}

if("customElements" in window) {
  customElements.define("thirdparty-web-component", PretendThirdParty);
}