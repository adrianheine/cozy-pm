import buble from "rollup-plugin-buble"
import json from 'rollup-plugin-json'
import builtins from 'rollup-plugin-node-builtins';
import nodeResolve from "rollup-plugin-node-resolve"
import commonJS from "rollup-plugin-commonjs"

export default [{
  input: "demo.js",
  output: { file: "demo_bundle.js", format: "es" },
  plugins: [
    buble({
      exclude: "node_modules/**",
      namedFunctionExpressions: false
    }),

    nodeResolve({
      main: true,
      browser: true
    }),

    commonJS({
      include: 'node_modules/**',
      sourceMap: false
    }),
    json(),
    builtins()
  ]
},{
  input: "test/test.js",
  output: { file: "test/test_built.js", format: "es" },
  plugins: [
    buble({
      exclude: "node_modules/**",
      namedFunctionExpressions: false
    }),

    nodeResolve({
      main: true
    }),

    commonJS({
      include: 'node_modules/**',
      sourceMap: false
    })
  ]
},
]
