import {EditorState, Selection, TextSelection} from "prosemirror-state"
import builder from "prosemirror-test-builder"
import ist from "ist"

import {schema} from "../src/schema.js"
import {keymap} from "../src/keymap.js"

const {builders, eq} = builder
const {doc, paragraph: p, bullet_list, list_item} = builders(schema, {})

function selFor(doc) {
  let a = doc.tag.a
  if (a != null) {
    let $a = doc.resolve(a)
    if ($a.parent.inlineContent) return new TextSelection($a, doc.tag.b != null ? doc.resolve(doc.tag.b) : undefined)
    else return new NodeSelection($a)
  }
  return Selection.atStart(doc)
}

function mkState(doc) {
  return EditorState.create({doc, selection: selFor(doc)})
}

const and = (cmd1, cmd2) => (state, dispatch) => {
  cmd1(state, tr => state = dispatch(tr))
  cmd2(state, dispatch)
}

function apply(doc, command, result) {
  doc.check()
  result.check()
  let state = mkState(doc)
  command(state, tr => state = state.apply(tr))
  ist(state.doc, result || doc, eq)
  if (result && result.tag.a != null) ist(state.selection, selFor(result), eq)
}

describe("cozy", () => {
  describe("keyMap", () => {
    describe("Backspace", () => {
      it("wraps paragraph after list in list item", () => {
        apply(doc(bullet_list(list_item(p("text"))), p("<a>here")), keymap.Backspace, doc(bullet_list(list_item(p("text")), list_item(p("<a>here")))))
      })
      it("wraps empty paragraph after list in list item", () => {
        apply(doc(bullet_list(list_item(p("text"))), p("<a>"), p("more")), keymap.Backspace, doc(bullet_list(list_item(p("text")), list_item(p("<a>"))), p("more")))
      })
      it("removes a list", () => {
        apply(doc(bullet_list(list_item(p("<a>text"))), p("here")), keymap.Backspace, doc(p("<a>text"), p("here")))
      })
      it("joins a list item at the start of the list", () => {
        apply(
          doc(bullet_list(list_item(p("<a>text")), list_item(p("here")))),
          keymap.Backspace,
          doc(p("<a>text"), bullet_list(list_item(p("here"))))
        )
      })
      it("joins a list item in the middle of the list", () => {
        apply(
          doc(bullet_list(list_item(p("a")), list_item(p("<a>text")), list_item(p("here")))),
          keymap.Backspace,
          doc(bullet_list(list_item(p("a<a>text")), list_item(p("here"))))
        )
      })
      it("joins a list item at the end of the list", () => {
        apply(
          doc(bullet_list(list_item(p("a")), list_item(p("<a>text")))),
          keymap.Backspace,
          doc(bullet_list(list_item(p("a<a>text"))))
        )
      })
      it("joins empty list items", () => {
        apply(
          doc(bullet_list(list_item(p("text")), list_item(p("<a>")))),
          keymap.Backspace,
          doc(bullet_list(list_item(p("text<a>"))))
        )
      })
      it("doesn't act within texts", () => {
        apply(doc(bullet_list(list_item(p("t<a>ext"))), p("here")), keymap.Backspace, doc(bullet_list(list_item(p("t<a>ext"))), p("here")))
        apply(doc(bullet_list(list_item(p("text<a>"))), p("here")), keymap.Backspace, doc(bullet_list(list_item(p("text<a>"))), p("here")))
        apply(doc(bullet_list(list_item(p("text"))), p("h<a>ere")), keymap.Backspace, doc(bullet_list(list_item(p("text"))), p("h<a>ere")))
        apply(doc(bullet_list(list_item(p("text"))), p("here<a>")), keymap.Backspace, doc(bullet_list(list_item(p("text"))), p("here<a>")))
      })
    })
    describe("Delete", () => {
      it("joins a paragraph with the last paragraph of a list directly in front of it", () => {
        apply(doc(bullet_list(list_item(p("text<a>"))), p("here")), keymap.Delete, doc(bullet_list(list_item(p("text<a>here")))))
      })
      it("doesn't jump over empty list items", () => {
        apply(
          doc(bullet_list(list_item(p("text<a>")), list_item(p("")), list_item(p("here")))),
          keymap.Delete,
          doc(bullet_list(list_item(p("text<a>"), p("")), list_item(p("here"))))
        )
      })
      it("removes a list", () => {
        apply(doc(p("here<a>"), bullet_list(list_item(p("text"))), p("here")), keymap.Delete, doc(p("here<a>"), p("text"), p("here")))
      })
      it("doesn't act within texts", () => {
        apply(doc(bullet_list(list_item(p("t<a>ext"))), p("here")), keymap.Delete, doc(bullet_list(list_item(p("t<a>ext"))), p("here")))
        apply(doc(bullet_list(list_item(p("<a>text"))), p("here")), keymap.Delete, doc(bullet_list(list_item(p("<a>text"))), p("here")))
        apply(doc(bullet_list(list_item(p("text"))), p("h<a>ere")), keymap.Delete, doc(bullet_list(list_item(p("text"))), p("h<a>ere")))
        apply(doc(bullet_list(list_item(p("text"))), p("<a>here")), keymap.Delete, doc(bullet_list(list_item(p("text"))), p("<a>here")))
      })
    })
    describe("Enter", () => {
      it("creates empty list items", () => {
        apply(doc(bullet_list(list_item(p("text<a>")))), keymap.Enter, doc(bullet_list(list_item(p("text")), list_item(p("<a>")))))
      })
      it("lifts empty list items", () => {
        apply(doc(bullet_list(list_item(p("text<a>")))), and(keymap.Enter, keymap.Enter), doc(bullet_list(list_item(p("text"))), p("<a>")))
      })
    })
  })
})
