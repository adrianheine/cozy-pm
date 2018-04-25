import {EditorView} from "prosemirror-view"
import {EditorState, TextSelection} from "prosemirror-state"
import {exampleSetup} from "prosemirror-example-setup"
import {suggestionsPlugin, triggerCharacter} from "@quartzy/prosemirror-suggestions"
import {keymap as makeKeymap} from "prosemirror-keymap"
import {keymap} from "./keymap.js"

import {schema} from "./schema"

import {ExternalItemView} from "./ExternalItemView"

export class Editor {
  constructor(place, options) {
    this.options = options
    this.dispatch = this.dispatch.bind(this)
    this.state = this.createState(options.doc)
    this.wrapper = place.appendChild(document.createElement("div"))
    this.wrapper.style.position = "relative"
    trackFocus(this.wrapper, "Editor-focused")
    this.tags = Object.keys(options.externalEntityTypes).reduce((tags, type) => {
      const def = options.externalEntityTypes[type]
      def.tags.forEach(tag => tags[tag] = type)
      return tags
    }, Object.create(null))
    this.externalEntityTypes = options.externalEntityTypes
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
      makeKeymap(keymap),
      suggestionsPlugin({
        debug: true,
        matcher: triggerCharacter("@", { allowSpaces: false }),
        onExit: ({text, range}) => {
          const type = this.tags[text.substr(1)]
          if (!type) return

          // FIXME There is a race condition here
          this.externalEntityTypes[type].create().then(id => {
            const node = schema.nodes.external_item.create({type, id})
            this.dispatch(this.state.tr.replaceRangeWith(range.from, range.to, node))
          })
        }
      })
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
