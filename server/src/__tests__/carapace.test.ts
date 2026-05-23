import { CarapaceProvider, getCarapaceCompletions } from '../carapace'

describe('CarapaceProvider', () => {
  describe('getCompletions', () => {
    it('returns empty array when executable path is empty', () => {
      const provider = new CarapaceProvider({ executablePath: '' })
      expect(provider.getCompletions({ commandName: 'git', commandArguments: [] })).toEqual([])
    })

    it('disables itself after spawn failure', () => {
      const provider = new CarapaceProvider({ executablePath: 'nonexistent-binary' })
      expect(provider.getCompletions({ commandName: 'git', commandArguments: [] })).toEqual([])
      // After first failure, should not try again
      expect(provider.getCompletions({ commandName: 'git', commandArguments: [] })).toEqual([])
    })
  })

  describe('toCompletionItems', () => {
    it('maps carapace completions to LSP completion items', () => {
      const provider = new CarapaceProvider({ executablePath: 'carapace' })
      const params = {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 4 },
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

    it('creates text edit when current word matches prefix', () => {
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
      expect((items[0].textEdit as any).newText).toBe('elp')
    })

    it('does not create text edit when current word does not match prefix', () => {
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
  })
})

describe('getCarapaceCompletions', () => {
  it('returns empty array when carapacePath is empty', () => {
    const result = getCarapaceCompletions({
      carapacePath: '',
      commandName: 'git',
      commandArguments: [],
      currentWord: '',
      params: {
        textDocument: { uri: 'file:///test.sh' },
        position: { line: 0, character: 0 },
      },
    })

    expect(result).toEqual([])
  })
})
