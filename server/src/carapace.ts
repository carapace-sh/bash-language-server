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

const MAX_CONSECUTIVE_SPAWN_ERRORS = 3

export class CarapaceProvider {
  private executablePath: string
  private consecutiveSpawnErrors = 0

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
    if (
      !this.executablePath ||
      this.consecutiveSpawnErrors >= MAX_CONSECUTIVE_SPAWN_ERRORS
    ) {
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
          this.consecutiveSpawnErrors++
          logger.debug(
            `CarapaceProvider: spawn failed (${this.consecutiveSpawnErrors}/${MAX_CONSECUTIVE_SPAWN_ERRORS}): ${result.error.message}`,
          )
        }
        return []
      }

      this.consecutiveSpawnErrors = 0

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
      const hasDisplay = completion.display && completion.display !== completion.value
      const label = hasDisplay ? completion.display! : completion.value
      const item: LSP.CompletionItem = {
        label,
        kind: carapaceTagToCompletionKind(completion.tag),
        data: { type: 'carapace' },
      }

      if (completion.description) {
        item.documentation = completion.description
      }

      if (hasDisplay) {
        item.filterText = completion.value
      }

      // Detect single operator characters (like '=') that tree-sitter parses as separate words
      // but should not affect completion filtering - bash treats --option= as one word
      const isSingleOperator =
        currentWord && currentWord.length === 1 && !/^[a-zA-Z0-9_-]$/.test(currentWord)

      if (
        currentWord &&
        !isSingleOperator &&
        (completion.value.startsWith(currentWord) || hasDisplay)
      ) {
        item.textEdit = {
          newText: quoteShellValue(completion.value),
          range: {
            start: {
              character: params.position.character - currentWord.length,
              line: params.position.line,
            },
            end: {
              character: params.position.character,
              line: params.position.line,
            },
          },
        }
      } else if (hasDisplay) {
        item.insertText = quoteShellValue(completion.value)
      } else if (currentWord === '' || isSingleOperator) {
        // Empty word or single operator case - insert at cursor position
        item.textEdit = {
          newText: quoteShellValue(completion.value),
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
  if (
    lowerTag.includes('file') ||
    lowerTag.includes('directory') ||
    lowerTag.includes('path')
  ) {
    return LSP.CompletionItemKind.File
  }
  if (lowerTag.includes('variable') || lowerTag.includes('env')) {
    return LSP.CompletionItemKind.Variable
  }

  return LSP.CompletionItemKind.Text
}

function quoteShellValue(value: string): string {
  // If value is empty or contains only safe characters, return as-is
  if (value === '' || /^[a-zA-Z0-9._+-/=:@%]+$/.test(value)) {
    return value
  }

  // Use single quotes to preserve value literally, escape any existing single quotes
  return "'" + value.replace(/'/g, "'\\''") + "'"
}
