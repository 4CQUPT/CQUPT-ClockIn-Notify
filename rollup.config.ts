import commonjs from "@rollup/plugin-commonjs"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import esbuild from "rollup-plugin-esbuild"
import { defineConfig } from "rollup"

export default defineConfig({
  input: ["src/main.ts"],
  output: {
    file: "./dist/index.js",
    format: "cjs",
    sourcemap: false
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    esbuild({
      minify: true
    })
  ]
})
