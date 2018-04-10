import {TextSelection} from "prosemirror-state"
import {undo, redo} from "prosemirror-history"
import {baseKeymap, exitCode, toggleMark, splitBlock, chainCommands} from "prosemirror-commands"
import {liftListItem, splitListItem} from "prosemirror-schema-list"

import {schema} from "./schema"

const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

let br = schema.nodes.hard_break, brCmd = chainCommands(exitCode, (state, dispatch) => {
  dispatch(state.tr.replaceSelectionWith(br.create()).scrollIntoView())
  return true
})
export const keymap = {
  "Enter": chainCommands(splitListItem(schema.nodes.list_item), liftListItem(schema.nodes.list_item), paragraphAboveMediaNode, splitBlock),
  "Mod-z": undo,
  "Mod-y": redo,
  "Mod-Z": redo,
  "Mod-b": toggleMark(schema.marks.strong),
  "Mod-i": toggleMark(schema.marks.em),
  "ArrowRight": addParagraphIfAtEnd,
  "ArrowDown": addParagraphIfAtEnd,
  "Mod-Enter": brCmd,
  "Shift-Enter": brCmd
}

if (mac) keymap["Ctrl-Enter"] = brCmd
for (let key in baseKeymap) if (!keymap.hasOwnProperty(key)) keymap[key] = baseKeymap[key]

// Delete empty paragraph when deleting image or button
keymap.Delete = function(state, dispatch, view) {

  // Join a paragraph below a list with the last list item
  if (state.selection.empty && dispatch) {
    let {$cursor} = state.selection
    if ($cursor && (view ? view.endOfTextblock("forward", state)
                          : $cursor.parentOffset == $cursor.parent.nodeSize - 2) &&
        $cursor.parent.type == schema.nodes.paragraph) {
      let maybeItem = $cursor.node(-1);

      if (maybeItem.type == schema.nodes.list_item && maybeItem == $cursor.node(-2).lastChild) {
        let cut = $cursor.after(1)
        if (cut) {
          let after = state.doc.childAfter(cut)
          if (after.node && after.node.type == schema.nodes.paragraph) {
            const origDispatch = dispatch
            dispatch = tr => origDispatch(tr.join(cut - 1, 2))
          }
        }
      }
    }
  }

  let disp = dispatch ? tr => {
    // If the cursor was in an empty node, and the selection after deleting
    // is a NodeSelection selecting a leaf node, delete that node
    if (state.selection.$from.parent.childCount == 0 && tr.selection.node && tr.selection.node.isLeaf)
      tr.deleteSelection()

    return dispatch(tr)
  } : null
  return baseKeymap.Delete(state, disp, view)
}

keymap.Backspace = (state, dispatch, view) => {
  if (state.selection.empty && dispatch) {
    let {$cursor} = state.selection
    if ($cursor && (view ? view.endOfTextblock("backward", state)
                          : $cursor.parentOffset == 0)) {
      const maybeLi = $cursor.node(-1)
      if (maybeLi.type === schema.nodes.list_item && $cursor.index(-2) > 0) {
        dispatch(state.tr.join($cursor.before(-1), 2))
        return true
      }
    }
  }
  return baseKeymap.Backspace(state, dispatch, view)
}

function paragraphAboveMediaNode(state, dispatch) {
  let {node, from} = state.selection
  if (!node || node.isTextblock) return false
  return insertParagraphAt(from, state, dispatch)
}

function addParagraphIfAtEnd(state, dispatch) {
  let {node, to} = state.selection
  if (node && !node.isTextblock && to == state.doc.content.size)
    return insertParagraphAtEnd(state, dispatch)
  return false
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
