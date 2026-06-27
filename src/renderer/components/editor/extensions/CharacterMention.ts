import { Mark, mergeAttributes } from '@tiptap/core'

export interface CharacterMentionAttrs {
  id: string
  name: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    characterMention: {
      setCharacterMention: (attrs: CharacterMentionAttrs) => ReturnType
      unsetCharacterMention: () => ReturnType
    }
  }
}

export const CharacterMentionExtension = Mark.create({
  name: 'characterMention',

  group: 'inline',

  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: '',
        parseHTML: el => el.getAttribute('data-character-id') ?? '',
        renderHTML: attrs => {
          if (!attrs.id) return {}
          return { 'data-character-id': attrs.id as string }
        }
      },
      name: {
        default: '',
        parseHTML: el => el.getAttribute('data-character-name') ?? '',
        renderHTML: attrs => {
          if (!attrs.name) return {}
          return { 'data-character-name': attrs.name as string }
        }
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-character-mention]',
        getAttrs: el => {
          if (typeof el === 'string') return {}
          const node = el as HTMLElement
          return {
            id: node.getAttribute('data-character-id') ?? '',
            name: node.getAttribute('data-character-name') ?? ''
          }
        }
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-character-mention': 'true',
        class: 'character-mention',
        title: HTMLAttributes.name as string
      }),
      0
    ]
  },

  addCommands() {
    return {
      setCharacterMention:
        (attrs: CharacterMentionAttrs) =>
        ({ commands }) => {
          return commands.setMark(this.name, attrs)
        },
      unsetCharacterMention:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        }
    }
  }
})
