import * as Parser from 'web-tree-sitter'

const _global: any = global

// Embedded tree-sitter.wasm (core runtime, base64 encoded)
import { TREE_SITTER_WASM_BASE64 } from './tree-sitter'

// Embedded tree-sitter-bash.wasm (language grammar, base64 encoded)
import { TREE_SITTER_BASH_WASM_BASE64 } from './tree-sitter-bash'

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export async function initializeParser(): Promise<Parser> {
  if (_global.fetch) {
    // NOTE: temporary workaround for emscripten node 18 support.
    // emscripten is used for compiling tree-sitter to wasm.
    // https://github.com/emscripten-core/emscripten/issues/16915
    delete _global.fetch
  }

  const coreWasmBytes = base64ToBytes(TREE_SITTER_WASM_BASE64)
  const bashWasmBytes = base64ToBytes(TREE_SITTER_BASH_WASM_BASE64)

  await Parser.init({
    wasmBinary: coreWasmBytes,
  })

  const parser = new Parser()

  /**
   * See https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web#generate-wasm-language-files
   *
   * To compile and use a new tree-sitter-bash version:
   *    sh scripts/upgrade-tree-sitter.sh
   */
  const lang = await Parser.Language.load(bashWasmBytes)

  parser.setLanguage(lang)
  return parser
}
