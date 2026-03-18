'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Heading2, Loader2 } from 'lucide-react'
import { useEffect } from 'react'

export default function RichTextEditor({ content, onUpdate, loading = false }: { content: string, onUpdate: (html: string) => void, loading?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML())
    },
    editorProps: {
        attributes: {
            class: 'ProseMirror-container'
        }
    }
  })

  useEffect(() => {
    if (editor && content !== undefined) {
      const currentContent = editor.getHTML()
      if (content !== currentContent && !editor.isFocused) {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  if (!editor) {
    return <div className="tiptap-loading" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}><Loader2 className="spinner" size={16} /></div>
  }

  return (
    <div className={`tiptap-editor ${loading ? 'loading' : ''}`}>
      <div className="tiptap-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`${editor.isActive('bold') ? 'is-active' : ''}`}><Bold size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`${editor.isActive('italic') ? 'is-active' : ''}`}><Italic size={14} /></button>
        <span className="tiptap-toolbar-divider" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}><Heading2 size={14} /></button>
        <span className="tiptap-toolbar-divider" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`${editor.isActive('bulletList') ? 'is-active' : ''}`}><List size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`${editor.isActive('orderedList') ? 'is-active' : ''}`}><ListOrdered size={14} /></button>
      </div>
      <div className="tiptap-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
