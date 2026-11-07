'use client'

import { useRef, useState } from 'react'
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3, List, ListOrdered, Quote,
  Link2, Link2Off, ImagePlus, Undo2, Redo2, Minus, Loader2,
} from 'lucide-react'
import { uploadImage, IMAGE_ACCEPT } from './uploadImage'
import { notify } from '@/components/ui/toaster'

interface Props {
  value: string
  onChange: (html: string) => void
  onNormalize?: (html: string) => void
  placeholder?: string
  minHeight?: number
}

function ToolButton({ onClick, active, disabled, label, children }: {
  onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg transition-colors disabled:opacity-35 ${
        active ? 'bg-[#74ACDF]/20 text-[#cfe6f8]' : 'text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor, onPickImage, uploading }: { editor: Editor; onPickImage: () => void; uploading: boolean }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL del enlace (https://…)', prev ?? 'https://')
    if (url === null) return
    if (url.trim() === '' || url.trim() === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url.trim())) {
      notify.error('El enlace debe empezar con https://, http://, mailto: o /')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  const c = () => editor.chain().focus()
  const sep = <span className="w-px h-6 bg-white/10 mx-1 shrink-0" aria-hidden="true" />

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1.5 border-b border-white/10 bg-white/[0.02]" role="toolbar" aria-label="Formato">
      <ToolButton label="Título" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolButton>
      <ToolButton label="Subtítulo" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolButton>
      {sep}
      <ToolButton label="Negrita" active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="w-4 h-4" /></ToolButton>
      <ToolButton label="Cursiva" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolButton>
      <ToolButton label="Subrayado" active={s.underline} onClick={() => c().toggleUnderline().run()}><Underline className="w-4 h-4" /></ToolButton>
      <ToolButton label="Tachado" active={s.strike} onClick={() => c().toggleStrike().run()}><Strikethrough className="w-4 h-4" /></ToolButton>
      {sep}
      <ToolButton label="Lista" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List className="w-4 h-4" /></ToolButton>
      <ToolButton label="Lista numerada" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolButton>
      <ToolButton label="Cita" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolButton>
      <ToolButton label="Separador" onClick={() => c().setHorizontalRule().run()}><Minus className="w-4 h-4" /></ToolButton>
      {sep}
      <ToolButton label="Enlace" active={s.link} onClick={setLink}><Link2 className="w-4 h-4" /></ToolButton>
      <ToolButton label="Quitar enlace" disabled={!s.link} onClick={() => c().unsetLink().run()}><Link2Off className="w-4 h-4" /></ToolButton>
      <ToolButton label="Insertar imagen" disabled={uploading} onClick={onPickImage}>
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
      </ToolButton>
      {sep}
      <ToolButton label="Deshacer" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className="w-4 h-4" /></ToolButton>
      <ToolButton label="Rehacer" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className="w-4 h-4" /></ToolButton>
    </div>
  )
}

export function RichTextEditor({ value, onChange, onNormalize, placeholder = 'Escribí el contenido…', minHeight = 280 }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, protocols: ['http', 'https', 'mailto'] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose-ar focus:outline-none px-4 py-3',
        style: `min-height:${minHeight}px`,
      },
    },
    // Re-serialize stored HTML through the editor schema so previews never render legacy markup
    onCreate: ({ editor: e }) => onNormalize?.(e.isEmpty ? '' : e.getHTML()),
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  })

  const insertImage = async (file: File) => {
    if (!editor) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      const alt = file.name.replace(/\.[^.]+$/, '').slice(0, 120)
      editor.chain().focus().setImage({ src: url, alt }).run()
      notify.success('Imagen insertada')
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'No se pudo subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0A1628] overflow-hidden focus-within:border-[#74ACDF]/60 transition-colors">
      {editor ? (
        <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileRef.current?.click()} />
      ) : (
        <div className="h-12 border-b border-white/10" />
      )}
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void insertImage(f)
        }}
      />
      <style>{`
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #5f7896; float: left; height: 0; pointer-events: none; }
        .tiptap img.ProseMirror-selectednode { outline: 2px solid #74ACDF; }
      `}</style>
    </div>
  )
}
