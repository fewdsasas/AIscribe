import { InputRule, mergeAttributes, Node } from '@tiptap/core'
import type { NodeType } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'

export interface SceneBlockAttributes {
  pov: string
  setting: string
  characters: string[]
  sceneNumber: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sceneBlock: {
      insertSceneBlock: (attrs?: Partial<SceneBlockAttributes>) => ReturnType
    }
  }
}

function getNextSceneNumber(state: EditorState): number {
  let max = 0
  state.doc.descendants(node => {
    if (node.type.name === 'sceneBlock' && typeof node.attrs.sceneNumber === 'number') {
      max = Math.max(max, node.attrs.sceneNumber)
    }
  })
  return max + 1
}

export function insertSceneBlockFromInputRule(
  state: EditorState,
  range: { from: number; to: number },
  type: NodeType,
  _storage: { sceneCounter: number }
): Transaction {
  const { tr } = state
  const start = range.from
  const end = range.to

  // Replace the matched text with a new scene block
  tr.delete(start, end)

  const node = type.create({ sceneNumber: getNextSceneNumber(state) }, state.schema.nodes.paragraph.create())

  tr.insert(start, node)
  return tr
}

export const NovelStructureExtension = Node.create<Record<string, never>, { sceneCounter: number }>({
  name: 'sceneBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  addOptions() {
    return {}
  },

  addStorage() {
    return { sceneCounter: 0 }
  },

  addAttributes() {
    return {
      pov: {
        default: '',
        parseHTML: el => el.getAttribute('data-pov') ?? '',
        renderHTML: attrs => {
          if (!attrs.pov) return {}
          return { 'data-pov': attrs.pov as string }
        }
      },
      setting: {
        default: '',
        parseHTML: el => el.getAttribute('data-setting') ?? '',
        renderHTML: attrs => {
          if (!attrs.setting) return {}
          return { 'data-setting': attrs.setting as string }
        }
      },
      characters: {
        default: [] as string[],
        parseHTML: el => {
          const data = el.getAttribute('data-characters')
          return data
            ? (() => {
                try {
                  return JSON.parse(data)
                } catch {
                  return []
                }
              })()
            : []
        },
        renderHTML: attrs => {
          const chars = attrs.characters as string[]
          if (!chars || chars.length === 0) return {}
          return { 'data-characters': JSON.stringify(chars) }
        }
      },
      sceneNumber: {
        default: 0,
        parseHTML: el => parseInt(el.getAttribute('data-scene-number') ?? '0'),
        renderHTML: attrs => {
          if (!attrs.sceneNumber) return {}
          return { 'data-scene-number': String(attrs.sceneNumber) }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-scene-block]',
        getAttrs: el => {
          if (typeof el === 'string') return {}
          const node = el as HTMLElement
          return {
            pov: node.getAttribute('data-pov') ?? '',
            setting: node.getAttribute('data-setting') ?? '',
            characters: (() => {
              const raw = node.getAttribute('data-characters')
              if (!raw) return []
              try {
                return JSON.parse(raw)
              } catch {
                return []
              }
            })(),
            sceneNumber: parseInt(node.getAttribute('data-scene-number') ?? '0')
          }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-scene-block': 'true',
        class: 'scene-block',
        'data-scene-number': (HTMLAttributes.sceneNumber as number) ?? 0
      }),
      0
    ]
  },

  addCommands() {
    return {
      insertSceneBlock:
        attrs =>
        ({ commands, state }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              sceneNumber: getNextSceneNumber(state),
              ...attrs
            },
            content: [
              {
                type: 'paragraph'
              }
            ]
          })
        }
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|___|\*\*\*)\s$/,
        handler: ({ state, range }) => {
          insertSceneBlockFromInputRule(state, range, this.type, this.storage)
        }
      })
    ]
  }
})
