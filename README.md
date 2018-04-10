# Cozy editor

This module provides a set of ProseMirror extensions that implement
the schema and UI designed for Cozy.

The library itself lives inside the `src` directory, as a set of ES6
modules.

The top-level `index.html` and `demo.js` provide a demo for trying the
code out.

## Building

Running `npm install` in this repository will install the
dependencies, along with [rollup](http://rollupjs.org/) for bundling.
It will also build `demo_bundle.js`, which is the script that
`index.html` loads.

You can run `npm run build` to rebuild the bundle, or `npm run watch`
to start a process that keeps rebuilding it every time the source
files change.

## Interface

The file `src/schema.js` exports the binding `schema`, which is a
[ProseMirror schema](http://prosemirror.net/ref.html#model.Schema)
which models Cozy-style documents.

The file `src/index.js` exports the binding `Editor`, which is a class
that wraps a ProseMirror editor. You can instantiate it with first the
DOM node it should append itself to, and then an options object.

```
let myEditor = new Editor(document.querySelector("#editor"), {
  doc: someProseMirrorDoc,
  externalEntityTypes: {
    todo: {
      tags: [ "todo", "task" ],
      create: () => Promise.resolve("newTodoId"),
      register: ({id}, render) => watchTodo(id, todoText => {
        const span = document.createElement("span")
        span.textContent = todoText
        render(span)
      })
    }
  },
  onChange: saveDocument
})
```

The `doc` option provides the initial document. It is optional, and
should be a ProseMirror document, for example produced by
[`DOMParser.parse`](http://prosemirror.net/ref.html#model.DOMParser.parse),
when given.

An editor instance has a `doc` property, which holds the current
ProseMirror document, which can be read and written to.
