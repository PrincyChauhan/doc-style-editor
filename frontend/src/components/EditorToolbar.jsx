import React from 'react';
import { useEditorState } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Quote, Undo, Redo,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  Code,
} from 'lucide-react';

function ToolbarButton({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      // onMouseDown + preventDefault keeps editor focus when clicking toolbar
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={title}
      className={[
        'toolbar-btn',
        active ? 'is-active' : '',
        disabled ? 'opacity-40 cursor-not-allowed' : '',
      ].join(' ')}
      aria-label={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="toolbar-separator" aria-hidden="true" />;
}

export default function EditorToolbar({ editor }) {
  // useEditorState subscribes to editor updates so active states re-render correctly
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive('bold'),
      isItalic: ctx.editor.isActive('italic'),
      isUnderline: ctx.editor.isActive('underline'),
      isStrike: ctx.editor.isActive('strike'),
      isCode: ctx.editor.isActive('code'),
      isH1: ctx.editor.isActive('heading', { level: 1 }),
      isH2: ctx.editor.isActive('heading', { level: 2 }),
      isH3: ctx.editor.isActive('heading', { level: 3 }),
      isBullet: ctx.editor.isActive('bulletList'),
      isOrdered: ctx.editor.isActive('orderedList'),
      isBlockquote: ctx.editor.isActive('blockquote'),
      isAlignLeft: ctx.editor.isActive({ textAlign: 'left' }),
      isAlignCenter: ctx.editor.isActive({ textAlign: 'center' }),
      isAlignRight: ctx.editor.isActive({ textAlign: 'right' }),
      canUndo: ctx.editor.can().undo(),
      canRedo: ctx.editor.can().redo(),
    }),
  });

  if (!editor) return null;

  const e = editor; // shorthand

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-white border-b border-gray-200 sticky top-14 z-10"
      role="toolbar"
      aria-label="Text formatting"
    >
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => e.chain().focus().undo().run()}
        disabled={!editorState.canUndo}
        title="Undo (⌘Z)"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().redo().run()}
        disabled={!editorState.canRedo}
        title="Redo (⌘⇧Z)"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <Sep />

      {/* Headings */}
      <ToolbarButton
        onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editorState.isH1}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editorState.isH2}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editorState.isH3}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <Sep />

      {/* Inline marks */}
      <ToolbarButton
        onClick={() => e.chain().focus().toggleBold().run()}
        active={editorState.isBold}
        title="Bold (⌘B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleItalic().run()}
        active={editorState.isItalic}
        title="Italic (⌘I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleUnderline().run()}
        active={editorState.isUnderline}
        title="Underline (⌘U)"
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleStrike().run()}
        active={editorState.isStrike}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleCode().run()}
        active={editorState.isCode}
        title="Inline code"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>

      <Sep />

      {/* Lists */}
      <ToolbarButton
        onClick={() => e.chain().focus().toggleBulletList().run()}
        active={editorState.isBullet}
        title="Bullet list"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleOrderedList().run()}
        active={editorState.isOrdered}
        title="Numbered list"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().toggleBlockquote().run()}
        active={editorState.isBlockquote}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>

      <Sep />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => e.chain().focus().setTextAlign('left').run()}
        active={editorState.isAlignLeft}
        title="Align left"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().setTextAlign('center').run()}
        active={editorState.isAlignCenter}
        title="Align center"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => e.chain().focus().setTextAlign('right').run()}
        active={editorState.isAlignRight}
        title="Align right"
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}
