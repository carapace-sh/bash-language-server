import { spawnSync } from 'node:child_process'

import * as LSP from 'vscode-languageserver/node'

import { logger } from './util/logger'

export interface CarapaceCompletion {
  value: string
  display?: string
  description?: string
  style?: string
  tag?: string
}

export interface CarapaceResponse {
  version: string
  values: CarapaceCompletion[]
  nospace: string
}

export interface CarapaceConfig {
  path: string
}

export class CarapaceProvider {
  private executablePath: string
  private canComplete = true

  constructor({ executablePath }: { executablePath: string }) {
    this.executablePath = executablePath
  }

  public getCompletions({
    commandName,
    commandArguments,
  }: {
    commandName: string
    commandArguments: string[]
  }): CarapaceCompletion[] {
    if (!this.canComplete || !this.executablePath) {
      return []
    }

    try {
      const args = [commandName, 'export', commandName, ...commandArguments]
      logger.debug(`CarapaceProvider: spawning ${this.executablePath} ${args.join(' ')}`)

      const result = spawnSync(this.executablePath, args, {
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      if (result.status !== 0) {
        if (result.error) {
          logger.debug(
            `CarapaceProvider: executable not found or failed, disabling: ${result.error.message}`,
          )
          this.canComplete = false
        }
        return []
      }

      const stdout = result.stdout.toString().trim()
      if (!stdout) {
        return []
      }

      const response: CarapaceResponse = JSON.parse(stdout)
      return response.values || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn(`CarapaceProvider: failed to get completions: ${errorMessage}`)
      return []
    }
  }

  public toCompletionItems(
    completions: CarapaceCompletion[],
    currentWord: string,
    params: LSP.TextDocumentPositionParams,
  ): LSP.CompletionItem[] {
    return completions.map((completion) => {
      const label = completion.value
      const item: LSP.CompletionItem = {
        label,
        kind: carapaceTagToCompletionKind(completion.tag),
        data: { type: 'carapace' },
      }

      if (completion.description) {
        item.documentation = completion.description
      }

      if (completion.display && completion.display !== completion.value) {
        item.detail = completion.display
      }

      if (currentWord && label.startsWith(currentWord)) {
        item.textEdit = {
          newText: label.slice(currentWord.length),
          range: {
            start: {
              character: params.position.character,
              line: params.position.line,
            },
            end: {
              character: params.position.character,
              line: params.position.line,
            },
          },
        }
      }

      return item
    })
  }
}

function carapaceTagToCompletionKind(tag?: string): LSP.CompletionItemKind {
  if (!tag) {
    return LSP.CompletionItemKind.Text
  }

  const lowerTag = tag.toLowerCase()
  if (
    lowerTag.includes('flag') ||
    lowerTag.includes('shorthand') ||
    lowerTag.includes('longhand')
  ) {
    return LSP.CompletionItemKind.Constant
  }
  if (lowerTag.includes('command') || lowerTag.includes('subcommand')) {
    return LSP.CompletionItemKind.Module
  }
  if (lowerTag.includes('file') || lowerTag.includes('directory') || lowerTag.includes('path')) {
    return LSP.CompletionItemKind.File
  }
  if (lowerTag.includes('variable') || lowerTag.includes('env')) {
    return LSP.CompletionItemKind.Variable
  }

  return LSP.CompletionItemKind.Text
}

export function getCarapaceCompletions({
  carapacePath,
  commandName,
  commandArguments,
  currentWord,
  params,
}: {
  carapacePath: string
  commandName: string
  commandArguments: string[]
  currentWord: string
  params: LSP.TextDocumentPositionParams
}): LSP.CompletionItem[] {
  if (!carapacePath) {
    return []
  }

  const provider = new CarapaceProvider({ executablePath: carapacePath })
  const completions = provider.getCompletions({ commandName, commandArguments })
  return provider.toCompletionItems(completions, currentWord, params)
}
