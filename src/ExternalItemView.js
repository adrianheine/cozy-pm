export class ExternalItemView {
  constructor(node, externalEntityTypes) {
    this.dom = document.createElement("span")
    this.dom.className = "cozy-external-item"
    this.dom.dataset.cozyExternalId = node.attrs.id
    this.dom.dataset.cozyExternalType = node.attrs.type
    this.dom.textContent = "Loading …"
    this.unregister = externalEntityTypes[node.attrs.type].register(node.attrs, dom => this.dom.replaceChild(dom, this.dom.firstChild))
  }

  destroy() {
    this.unregister()
  }
}
