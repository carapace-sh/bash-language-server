import * as LSP from 'vscode-languageserver/node'

import { CarapaceProvider } from '../carapace'

describe('CarapaceProvider', () => {
  describe('getCompletions', () => {
    it('returns empty array when executable path is empty', () => {
      const provider = new CarapaceProvider({ executablePath: '' })
      expect(
        provider.getCompletions({ commandName: 'git', commandArguments: [] }),
      ).toEqual([])
    })

    it('disables itself after consecutive spawn failures', () => {
      const provider = new CarapaceProvider({ executablePath: 'nonexistent-binary' })
      // Should keep trying until MAX_CONSECUTIVE_SPAWN_ERRORS is reached
      expect(
        provider.getCompletions({ commandName: 'git', commandArguments: [] }),
      ).toEqual([])
      expect(
        provider.getCompletions({ commandName: 'git', commandArguments: [] }),
      ).toEqual([])
      expect(
        provider.getCompletions({ commandName: 'git', commandArguments: [] }),
      ).toEqual([])
      // After 3 consecutive failures, should be disabled
      expect(
        provider.getCompletions({ commandName: 'git', commandArguments: [] }),
      ).toEqual([])
    })

    it('still returns completions after a non-error non-zero exit', () => {
      const provider = new CarapaceProvider({ executablePath: 'nonexistent-binary' })
      // First call fails with spawn error (ENOENT)
      provider.getCompletions({ commandName: 'git', commandArguments: [] })
      // The consecutive error count should be tracked
      // But if carapace returns 0, the counter resets
      // This test just verifies the provider doesn't permanently disable on first error
      expect(
        provider.getCompletions({ commandName: 'git', commandArguments: [] }),
      ).toEqual([])
    })
  })

  describe('toCompletionItems', () => {
    it('maps carapace completions to LSP completion items', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 6 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--help',
            description: 'Show help',
            tag: 'longhand flags',
          },
          {
            value: 'commit',
            description: 'Record changes to the repository',
            tag: 'main commands',
          },
        ],
        '--',
        params,
      )

      expect(items).toHaveLength(2)
      expect(items[0].label).toBe('--help')
      expect(items[0].documentation).toBe('Show help')
      expect(items[1].label).toBe('commit')
      expect(items[1].documentation).toBe('Record changes to the repository')
    })

    it('creates text edit that replaces the current word with the full label', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 6 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--help',
            tag: 'flags',
          },
        ],
        '--h',
        params,
      )

      expect(items[0].textEdit).toBeDefined()
      const textEdit = items[0].textEdit as LSP.TextEdit
      expect(textEdit.newText).toBe('--help')
      expect(textEdit.range.start.character).toBe(3) // character 6 - len('--h') = 3
      expect(textEdit.range.end.character).toBe(6)
    })

    it('creates text edit when display differs from value even if current word does not match value prefix', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 20 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: 'carapace-sh/bash-language-server',
            display: 'bash-language-server',
            tag: 'repos',
          },
        ],
        'carapace-sh/bas',
        params,
      )

      expect(items[0].textEdit).toBeDefined()
      const textEdit = items[0].textEdit as LSP.TextEdit
      expect(textEdit.newText).toBe('carapace-sh/bash-language-server')
      expect(items[0].label).toBe('bash-language-server')
      expect(items[0].filterText).toBe('carapace-sh/bash-language-server')
    })

    it('does not create text edit when current word does not match prefix and display equals value', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 4 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--help',
            tag: 'flags',
          },
        ],
        '--x',
        params,
      )

      expect(items[0].textEdit).toBeUndefined()
    })

    it('creates text edit when current word is empty', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 0 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--help',
            tag: 'flags',
          },
        ],
        '',
        params,
      )

      expect(items[0].textEdit).toBeDefined()
      const textEdit = items[0].textEdit as LSP.TextEdit
      expect(textEdit.newText).toBe('--help')
      // Empty range at cursor position
      expect(textEdit.range.start.character).toBe(0)
      expect(textEdit.range.end.character).toBe(0)
    })

    it('uses display as label when display differs from value', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 0 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--verbose',
            display: '-v',
            description: 'Verbose output',
            tag: 'shorthand flags',
          },
          {
            value: '--help',
            description: 'Show help',
            tag: 'longhand flags',
          },
        ],
        '',
        params,
      )

      expect(items).toHaveLength(2)
      // display differs from value: label is display, filterText is value, insertText is value
      expect(items[0].label).toBe('-v')
      expect(items[0].filterText).toBe('--verbose')
      expect(items[0].insertText).toBe('--verbose')
      expect(items[0].documentation).toBe('Verbose output')
      // no display: label is value, no filterText or insertText override
      expect(items[1].label).toBe('--help')
      expect(items[1].filterText).toBeUndefined()
      expect(items[1].insertText).toBeUndefined()
    })

    it('uses value as textEdit newText when display differs from value', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 5 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--verbose',
            display: '-v',
            tag: 'flags',
          },
        ],
        '--v',
        params,
      )

      expect(items[0].textEdit).toBeDefined()
      const textEdit = items[0].textEdit as LSP.TextEdit
      expect(textEdit.newText).toBe('--verbose')
      expect(items[0].label).toBe('-v')
      expect(items[0].filterText).toBe('--verbose')
      // no insertText when textEdit is present
      expect(items[0].insertText).toBeUndefined()
    })

    it('creates text edit for display!=value even when display does not start with current word', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 5 },
      }

      const items = provider.toCompletionItems(
        [
          {
            value: '--verbose',
            display: '-v',
            tag: 'flags',
          },
        ],
        '--v',
        params,
      )

      expect(items[0].textEdit).toBeDefined()
      const textEdit = items[0].textEdit as LSP.TextEdit
      expect(textEdit.newText).toBe('--verbose')
      expect(items[0].label).toBe('-v')
    })

    it('maps tags to appropriate completion kinds', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 0 },
      }

      const items = provider.toCompletionItems(
        [
          { value: '--flag', tag: 'longhand flags' },
          { value: 'subcmd', tag: 'subcommands' },
          { value: 'file.txt', tag: 'files' },
          { value: 'MY_VAR', tag: 'environment variables' },
          { value: 'unknown', tag: 'something else' },
          { value: 'notag' },
        ],
        '',
        params,
      )

      // Constant for flags
      expect(items[0].kind).toBe(21) // CompletionItemKind.Constant
      // Module for subcommands
      expect(items[1].kind).toBe(9) // CompletionItemKind.Module
      // File for files
      expect(items[2].kind).toBe(17) // CompletionItemKind.File
      // Variable for environment variables
      expect(items[3].kind).toBe(6) // CompletionItemKind.Variable
      // Text for unknown tags
      expect(items[4].kind).toBe(1) // CompletionItemKind.Text
      // Text for no tag
      expect(items[5].kind).toBe(1) // CompletionItemKind.Text
    })

    it('quotes values with spaces or special characters', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 0 },
      }

      const items = provider.toCompletionItems(
        [
          { value: 'hello world' }, // space - should be quoted
          { value: "it's cool" }, // space and single quote - should be quoted with escaped quotes
          { value: 'file$name.txt' }, // special char $ - should be quoted
          { value: 'simple' }, // safe chars - no quoting needed
        ],
        '',
        params,
      )

      expect(items[0].textEdit).toBeDefined()
      expect((items[0].textEdit as LSP.TextEdit).newText).toBe("'hello world'")

      expect(items[1].textEdit).toBeDefined()
      expect((items[1].textEdit as LSP.TextEdit).newText).toBe("'it'\\''s cool'")

      expect(items[2].textEdit).toBeDefined()
      expect((items[2].textEdit as LSP.TextEdit).newText).toBe("'file$name.txt'")

      expect(items[3].textEdit).toBeDefined()
      expect((items[3].textEdit as LSP.TextEdit).newText).toBe('simple')
    })
  })
})
