import {toggleMark} from "prosemirror-commands"
import {liftListItem, wrapInList} from "prosemirror-schema-list"
import crel from "crel"

import {schema} from "./schema"

function buttonBar(elements) {
  return crel("div", {class: "editor-tooltip-content editor-tooltip-content-buttons"}, elements)
}

function makeButton(content, active, disabled, handler) {
  let attrs = {class: "editor-tooltip-button" + (active ? " editor-tooltip-button-active" : "")}
  if (disabled) attrs.disabled = "disabled"
  let button = crel("button", attrs, content)
  button.addEventListener("mousedown", e => {
    if (e.button == 0) {
      e.preventDefault()
      handler(e)
    }
  })
  return button
}

function iconButton(name, active, disabled, handler) {
  return makeButton(crel("span", {class: "fa fa-" + name}), active, disabled, handler)
}

function commandButton(name, active, command, state, {dispatch}) {
  return iconButton(name, active, !command(state), () => command(state, dispatch))
}

function markActive(state, type) {
  let {from, to, empty} = state.selection
  if (empty) return type.isInSet(state.storedMarks || state.doc.marksAt(from))
  else return state.doc.rangeHasMark(from, to, type)
}

function markButton(icon, state, options, type) {
  let active = markActive(state, type)
  return iconButton(icon, active, false, () => toggleMark(type)(state, options.dispatch))
}

function tooltipContent(dom) {
  while (dom && !/editor-tooltip-content/.test(dom.className)) dom = dom.parentNode
  return dom
}

function showInput(oldContent, placeholder, value, options, done) {
  let ok = crel("button", {type: "submit", class: "tooltip-input-submit"},
                crel("span", {class: "fa fa-check"}))
  let cancel = crel("button", {type: "reset", class: "tooltip-input-cancel"},
                    crel("span", {class: "fa fa-close"}))
  let text = crel("input", {type: "text", placeholder, value, class: "tooltip-input"})
  let form = crel("form", text, ok, cancel)
  let dom = crel("div", {class: "editor-tooltip-content"}, form)
  oldContent.parentNode.replaceChild(dom, oldContent)
  let closed = false
  function close() {
    if (!closed) {
      closed = true
      if (dom.parentNode) dom.parentNode.replaceChild(oldContent, dom)
    }
  }
  cancel.addEventListener("mousedown", e => {
    e.preventDefault()
    close()
    options.focus()
  })
  form.addEventListener("submit", e => {
    e.preventDefault()
    close()
    options.focus()
    done(text.value)
  })
  text.focus()
  return dom
}

function linkButton(state, options) {
  let type = schema.marks.link, active = markActive(state, type)
  return iconButton("link", active, false, e => {
    if (active) {
      toggleMark(type)(state, options.dispatch)
    } else {
      showInput(tooltipContent(e.target), "Insert a link here", "", options, href => {
        if (href) toggleMark(type, {href})(options.getState(), options.dispatch)
      }).className += " editor-link-input-toolbar"
    }
  })
}

function blocksBetween(doc, from, to) {
  let blocks = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.isBlock) {
      blocks.push({node, pos})
      return false
    }
  })
  return blocks
}

let setBlockTypes = (posTypeAndAttrs, state) => posTypeAndAttrs.reduce(
  (tr, {pos, type, attrs}) => tr.clearIncompatible(pos, type).setNodeMarkup(pos, type, attrs),
  state.tr
)

function alignButton(state, options) {
  let parents = blocksBetween(state.doc, state.selection.from, state.selection.to)
  let centered = parents.some(({node}) => node.attrs.align == "center")
  return iconButton(centered ? "align-left" : "align-center", false, false, () => {
    let tr = setBlockTypes(parents.map(({node, pos}) => {
      let type = node.type
      let attrs = {}
      for (let name in node.attrs) attrs[name] = node.attrs[name]
      attrs.align = centered ? "left" : "center"
      return {pos, type, attrs}
    }), state)
    options.dispatch(tr)
  })
}

function listButton(state, options) {
  let parents = blocksBetween(state.doc, state.selection.from, state.selection.to)
  let active = parents.some(({node}) => node.type === schema.nodes.bullet_list)
  const command = active ? liftListItem(schema.nodes.list_item) : wrapInList(schema.nodes.bullet_list)
  return commandButton("list-ul", active, command, state, options)
}

function textButtons(state, options) {
  return [
    markButton("bold", state, options, schema.marks.strong),
    markButton("italic", state, options, schema.marks.em),
    alignButton(state, options),
    listButton(state, options),
    linkButton(state, options)
  ]
}

function selectionPosition(view) {
  let sel = window.getSelection()
  if (!sel.anchorNode || !view.dom.contains(sel.anchorNode)) return null
  let rects = sel.getRangeAt(0).getClientRects()
  if (!rects.length) return null

  let left, right, top, bottom
  for (let i = 0; i < rects.length; i++) {
    let rect = rects[i]
    if (left == right) {
      ;({left, right, top, bottom} = rect)
    } else if (rect.top < bottom - 1 &&
               // Chrome bug where bogus rectangles are inserted at span boundaries
               (i == rects.length - 1 || Math.abs(rects[i + 1].left - rect.left) > 1)) {
      left = Math.min(left, rect.left)
      right = Math.max(right, rect.right)
      top = Math.min(top, rect.top)
    }
  }
  return {top, left: (left + right) / 2}
}

export class Tooltip {
  constructor(view, options) {
    this.view = view
    this.options = options
    this.lastState = null
    this.dom = crel("div", {class: "editor-tooltip"})

    this._isMouseDown = false
    // Hide tooltip during drag
    this.view.dom.addEventListener("dragstart", event => {
      if (this.dom.parentNode) this.dom.parentNode.removeChild(this.dom)
    })
    this.view.dom.addEventListener("dragend", event => {
      this._drawTooltip(this.lastState)
    })
    // Hide tooltip during drag selection
    this.view.dom.addEventListener("mousedown", event => {
      if (!this.dom || (!this.dom.contains(event.target) && this.dom !== event.target)) this._isMouseDown = true
    })
    window.addEventListener("mouseup", event => {
      if (this._isMouseDown) {
        this._isMouseDown = false
        this.lastState && this._drawTooltip(this.lastState)
      }
    })
  }

  tooltipFor(state) {
    if (this._isMouseDown) return
    let {empty, node} = state.selection
    if (!node && !empty)
      return this.selectionTooltip(state)
  }

  selectionTooltip(state) {
    let coords = selectionPosition(this.view)
    return coords && {dom: buttonBar(textButtons(state, this.options)), coords}
  }

  update(state) {
    // Button tooltip has a close button
    this.dom.style.display = null
    if (this.lastState && this.lastState.doc.eq(state.doc) && this.lastState.selection.eq(state.selection))
      return
    if (this.dom.contains(document.activeElement))
      return
    this.lastState = state
    this._drawTooltip(state)
  }

  _drawTooltip(state) {
    let tooltip = this.tooltipFor(state, this.options)
    if (!tooltip) {
      if (this.dom.parentNode) this.dom.parentNode.removeChild(this.dom)
      return
    }

    let wrap = this.view.dom.parentNode
    let outer = wrap.getBoundingClientRect()
    this.dom.textContent = ""
    this.dom.appendChild(tooltip.dom)
    this.dom.style.top = (tooltip.coords.top - outer.top - 7) + "px"
    this.dom.style.left = (tooltip.coords.left - outer.left) + "px"
    wrap.appendChild(this.dom)
  }
}
