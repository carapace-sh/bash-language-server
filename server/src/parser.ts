import * as Parser from 'web-tree-sitter'

const _global: any = global

// Embedded tree-sitter-bash.wasm (base64 encoded)
import { TREE_SITTER_BASH_WASM_BASE64 } from './tree-sitter-bash'

export async function initializeParser(): Promise<Parser> {
  if (_global.fetch) {
    // NOTE: temporary workaround for emscripten node 18 support.
    // emscripten is used for compiling tree-sitter to wasm.
    // https://github.com/emscripten-core/emscripten/issues/16915
    delete _global.fetch
  }

  await Parser.init({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        const wasmPath = require.resolve('web-tree-sitter/tree-sitter.wasm')
        return wasmPath
      }
      return file
    },
  })
  const parser = new Parser()

  /**
   * See https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web#generate-wasm-language-files
   *
   * To compile and use a new tree-sitter-bash version:
   *    sh scripts/upgrade-tree-sitter.sh
   */
  // Decode base64 to Uint8Array for Language.load
  const binaryString = atob(TREE_SITTER_BASH_WASM_BASE64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const lang = await Parser.Language.load(bytes)

  parser.setLanguage(lang)
  return parser
}
