import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  ArrowLeft, Share2, Check, Loader2, Eye, Crown,
  Edit3, Upload, Paperclip, FileText, X, AlertCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { getDocument, updateDocument, uploadAttachment } from '../api/documents';
import EditorToolbar from '../components/EditorToolbar';
import SharePanel from '../components/SharePanel';

const AUTOSAVE_DELAY = 1500;

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [attachUploading, setAttachUploading] = useState(false);
  const [attachError, setAttachError] = useState('');

  const saveTimerRef = useRef(null);
  const titleInputRef = useRef(null);
  const attachFileRef = useRef(null);

  // Keep a ref to the latest autoSave fn so the onUpdate closure is never stale
  const autoSaveRef = useRef(null);
  // Keep a ref to canEdit so onUpdate closure always sees the latest value
  const canEditRef = useRef(false);

  // ─── Load document ───────────────────────────────────────────────
  const fetchDoc = useCallback(async () => {
    try {
      const res = await getDocument(id);
      setDoc(res.data);
      setTitleValue(res.data.title);
      setLastSaved(new Date(res.data.updatedAt));
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You do not have access to this document.');
      } else if (err.response?.status === 404) {
        setError('Document not found.');
      } else {
        setError('Failed to load document.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  // ─── Auto-save ───────────────────────────────────────────────────
  const autoSave = useCallback(
    async (content) => {
      try {
        const res = await updateDocument(id, { content });
        setSaveStatus('saved');
        setLastSaved(new Date(res.data.updatedAt));
        setDoc((prev) => ({ ...prev, content: res.data.content, updatedAt: res.data.updatedAt }));
      } catch {
        setSaveStatus('error');
      }
    },
    [id]
  );

  // Keep ref current so the editor onUpdate closure can call it without going stale
  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  // ─── Tiptap editor ───────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CharacterCount,
    ],
    content: '',
    // Start non-editable; we flip it once the doc loads
    editable: false,
    onUpdate: ({ editor }) => {
      // Use the ref — never the stale closure value
      if (!canEditRef.current) return;
      setSaveStatus('saving');
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        autoSaveRef.current?.(editor.getHTML());
      }, AUTOSAVE_DELAY);
    },
  });

  // ─── Once doc loads: hydrate content + set editability ───────────
  useEffect(() => {
    if (!editor || !doc) return;

    const editable = doc.userRole === 'owner' || doc.userRole === 'edit';
    canEditRef.current = editable;

    // setEditable is the correct Tiptap 2 API
    editor.setEditable(editable);

    // Only set content on first load (when editor is still empty)
    // to avoid clobbering the user's in-progress edits on a re-fetch
    if (editor.isEmpty) {
      editor.commands.setContent(doc.content || '<p></p>', false);
    }
  }, [editor, doc]);

  // Derived state — safe to compute from doc
  const canEdit = doc?.userRole === 'owner' || doc?.userRole === 'edit';
  const isOwner = doc?.userRole === 'owner';

  // Cleanup debounce timer on unmount
  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  // ─── Title editing ───────────────────────────────────────────────
  const startEditTitle = () => {
    if (!canEdit) return;
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 50);
  };

  const commitTitleEdit = async () => {
    setIsEditingTitle(false);
    const trimmed = titleValue.trim() || 'Untitled Document';
    if (trimmed === doc.title) return;
    try {
      const res = await updateDocument(id, { title: trimmed });
      setDoc((prev) => ({ ...prev, title: res.data.title }));
      setTitleValue(res.data.title);
      setLastSaved(new Date(res.data.updatedAt));
    } catch {
      setTitleValue(doc.title);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') commitTitleEdit();
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTitleValue(doc.title);
    }
  };

  // ─── Attachment upload ───────────────────────────────────────────
  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachUploading(true);
    setAttachError('');
    try {
      await uploadAttachment(id, file);
      await fetchDoc();
    } catch (err) {
      setAttachError(err.response?.data?.error || 'Upload failed');
    } finally {
      setAttachUploading(false);
      e.target.value = '';
    }
  };

  // ─── Render states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <p className="text-gray-700 font-medium mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="text-blue-600 hover:underline text-sm">
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ── Top nav ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 flex-shrink-0">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-white" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={commitTitleEdit}
                onKeyDown={handleTitleKeyDown}
                className="w-full max-w-sm text-sm font-semibold text-gray-900 border-b border-blue-500 outline-none bg-transparent px-1"
                maxLength={255}
              />
            ) : (
              <button
                onClick={startEditTitle}
                disabled={!canEdit}
                className={`text-sm font-semibold text-gray-900 truncate max-w-xs px-1 py-0.5 rounded hover:bg-gray-100 ${
                  !canEdit ? 'cursor-default' : 'cursor-text'
                }`}
                title={canEdit ? 'Click to rename' : doc?.title}
              >
                {doc?.title}
              </button>
            )}
          </div>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                <span className="text-gray-400 hidden sm:inline">Saving…</span>
              </>
            )}
            {saveStatus === 'saved' && lastSaved && (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span className="text-gray-400 hidden sm:inline">
                  Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
                </span>
              </>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-500 text-xs">Save failed — check connection</span>
            )}
          </div>

          {/* Role badge */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 shrink-0 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200">
            {isOwner ? (
              <Crown className="w-3 h-3 text-amber-500" />
            ) : canEdit ? (
              <Edit3 className="w-3 h-3 text-green-500" />
            ) : (
              <Eye className="w-3 h-3 text-blue-500" />
            )}
            <span>{isOwner ? 'Owner' : canEdit ? 'Editor' : 'Viewer'}</span>
          </div>

          {/* Attach file */}
          {canEdit && (
            <button
              onClick={() => setShowAttachPanel(!showAttachPanel)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Attachments"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          )}

          {/* Share */}
          {isOwner && (
            <button
              onClick={() => setShowSharePanel(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Attachment drawer ────────────────────────────────────── */}
      {showAttachPanel && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => attachFileRef.current?.click()}
            disabled={attachUploading}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {attachUploading ? 'Uploading…' : 'Attach .txt / .md file'}
          </button>
          <input
            ref={attachFileRef}
            type="file"
            accept=".txt,.md"
            onChange={handleAttachFile}
            className="hidden"
          />
          {attachError && <span className="text-xs text-red-600">{attachError}</span>}
          {doc?.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-2 ml-4">
              {doc.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-1.5 text-xs bg-gray-100 px-2.5 py-1 rounded-full text-gray-600"
                >
                  <FileText className="w-3 h-3" />
                  <span>{att.original_name}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowAttachPanel(false)}
            className="ml-auto text-gray-400 hover:text-gray-600"
            aria-label="Close attachment panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Toolbar (shown only when editable) ──────────────────── */}
      {canEdit && editor && <EditorToolbar editor={editor} />}

      {/* ── View-only banner ─────────────────────────────────────── */}
      {!canEdit && doc && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-sm text-amber-700">
          <Eye className="w-4 h-4 shrink-0" />
          <span>You have view-only access to this document</span>
        </div>
      )}

      {/* ── Editor area ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 min-h-[calc(100vh-12rem)]">
            <EditorContent editor={editor} className="tiptap-editor" />
          </div>
        </div>
      </div>

      {/* ── Word / character count ───────────────────────────────── */}
      {editor && (
        <div className="bg-white border-t border-gray-100 px-4 py-1.5 text-xs text-gray-400 text-right select-none">
          {editor.storage.characterCount?.words() ?? 0} words ·{' '}
          {editor.storage.characterCount?.characters() ?? 0} characters
        </div>
      )}

      {/* ── Share panel ──────────────────────────────────────────── */}
      {showSharePanel && (
        <SharePanel
          doc={doc}
          onClose={() => setShowSharePanel(false)}
          onUpdate={fetchDoc}
        />
      )}
    </div>
  );
}
