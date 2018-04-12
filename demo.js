import {DOMParser, DOMSerializer} from "prosemirror-model"
import {schema} from "./src/schema"
import {Editor} from "./src"

let doc = DOMParser.fromSchema(schema).parse(document.querySelector("#content"));
const saveDocument = state => {
  if (state.doc != doc) {
    doc = state.doc
    console.log("Saved " + JSON.stringify(doc.toJSON()))
  }
}

const inc = {};
const watchTodo = (id, render) => {
  let stop = false
  const update = () => {
    inc[id] = (inc[id] || 0) + 1
    render(`This is todo ${id}, inc ${inc[id]}`)
    if (!stop) setTimeout(update, 2000)
  }
  setTimeout(update, 500)
  // return unwatch function
  return () => { stop = true }
}
let lastId = 1

window.editor = new Editor(document.querySelector("#editor"), {
  externalEntityTypes: {
    todo: {
      tags: [ "todo", "task" ],
      create: () => Promise.resolve(++lastId),
      register: ({id}, render) => watchTodo(id, todoText => {
        const span = document.createElement("span")
        span.textContent = todoText
        render(span)
      })
    }
  },
  doc,
  onChange: saveDocument
})
