import {DOMSerializer} from "prosemirror-model"

export class ExternalItemView {
  constructor(node, externalEntityTypes) {
    this.dom = DOMSerializer.renderSpec(window.document, node.type.spec.toDOM(node)).dom
    this.dom.textContent = "Loading …"
    this.unregister = externalEntityTypes[node.attrs.type].register(node.attrs, dom => this.dom.replaceChild(dom, this.dom.firstChild))
  }

  destroy() {
    this.unregister()
  }
}
