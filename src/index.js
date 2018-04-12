import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"
import {exampleSetup} from "prosemirror-example-setup"
import {keymap as makeKeymap} from "prosemirror-keymap"
import {keymap} from "./keymap.js"

import {schema} from "./schema"

class ExternalItemView {
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

export class Editor {
  constructor(place, options) {
    this.options = options
    this.dispatch = this.dispatch.bind(this)
    this.state = this.createState(options.doc)
    this.wrapper = place.appendChild(document.createElement("div"))
    this.wrapper.style.position = "relative"
    trackFocus(this.wrapper, "Editor-focused")
    this.view = new EditorView(this.wrapper, {
      state: this.state,
      dispatchTransaction: this.dispatch,
      nodeViews: { external_item(node) { return new ExternalItemView(node, options.externalEntityTypes) } },
      handleClick(view, pos) {
        if (pos == view.state.doc.content.size && !view.state.doc.lastChild.isTextblock)
          insertParagraphAtEnd(view.state, view.dispatch)
        return false
      }
    })
    this.view.dom.addEventListener("click", event => {
      for (let dom = event.target; dom != this.view.dom; dom = dom.parentNode)
        if (dom.nodeName == "A" && dom.href) return event.preventDefault()
    })
  }

  setState(state) {
    this.state = state
    this.view.updateState(state)
  }

  dispatch(tr) {
    this.setState(this.state.apply(tr))
    this.options.onChange(this.state)
  }

  createState(doc) {
    return EditorState.create({doc, schema, plugins: exampleSetup({schema}).concat([
      makeKeymap(keymap)
    ])})
  }

  get doc() {
    return this.state.doc
  }

  set doc(doc) {
    this.setState(this.createState(doc))
  }
}

function insertParagraphAt(pos, state, dispatch) {
  let tr = state.tr.insert(pos, schema.nodes.paragraph.create())
  tr.setSelection(TextSelection.create(tr.doc, pos + 1))
  dispatch(tr)
  return true
}

function insertParagraphAtEnd(state, dispatch) {
  return insertParagraphAt(state.doc.content.size, state, dispatch)
}

function trackFocus(dom, cls) {
  dom.addEventListener("focus", updateSoon, true)
  dom.addEventListener("blur", updateSoon, true)

  let status = null, timeout
  function updateSoon() {
    clearTimeout(timeout)
    timeout = setTimeout(update, 100)
  }
  function update() {
    let active = document.activeElement
    let newStatus = active != document.body && dom.contains(active)
    if (newStatus != status) {
      status = newStatus
      if (status) dom.classList.add(cls)
      else dom.classList.remove(cls)
    }
  }
  update()
}
