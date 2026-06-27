import { InputRule, mergeAttributes, Node } from '@tiptap/core'

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
        ({ commands }) => {
          this.storage.sceneCounter++
          return commands.insertContent({
            type: this.name,
            attrs: {
              sceneNumber: this.storage.sceneCounter,
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
          const { tr } = state
          const start = range.from
          const end = range.to

          // Replace the matched text with a new scene block
          tr.delete(start, end)

          this.storage.sceneCounter++

          const node = this.type.create(
            { sceneNumber: this.storage.sceneCounter },
            state.schema.nodes.paragraph.create()
          )

          tr.insert(start - 1, node)
        }
      })
    ]
  }
})
