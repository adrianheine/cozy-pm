import {schema as basicSchema} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {Schema} from "prosemirror-model"

export const schema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block").append({
    external_item: {
      attrs: {id: {}, type: {}},
      inline: true,
      group: "inline",
      parseDOM: [{tag: "span", getAttrs: node => ({id: node.dataset.cozyExternalId, type: node.dataset.cozyExternalType})}],
      toDOM(node) { return ["span", {class: "cozy-external-item", "data-cozy-external-id": node.attrs.id, "data-cozy-external-type": node.attrs.type}] },
    }
  }),
  marks: basicSchema.spec.marks
})
