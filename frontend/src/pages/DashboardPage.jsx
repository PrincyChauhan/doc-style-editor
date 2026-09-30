import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, LogOut, Upload, Trash2, Users,
  Clock, Crown, Eye, Edit3, Search, ChevronDown, X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import {
  listDocuments,
  createDocument,
  deleteDocument,
  uploadDocumentFile,
} from '../api/documents';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'owned' | 'shared'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await listDocuments();
      setOwned(res.data.owned);
      setShared(res.data.shared);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleCreate = async () => {
    try {
      const res = await createDocument({ title: 'Untitled Document' });
      navigate(`/docs/${res.data.id}`);
    } catch {
      setError('Failed to create document');
    }
  };

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId);
      setOwned((prev) => prev.filter((d) => d.id !== docId));
      setDeleteConfirm(null);
    } catch {
      setError('Failed to delete document');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'md'].includes(ext)) {
      setError('Only .txt and .md files are supported for import.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const res = await uploadDocumentFile(file);
      navigate(`/docs/${res.data.document.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Filter logic
  const query = search.toLowerCase();
  const allDocs = [
    ...owned.map((d) => ({ ...d, type: 'owned' })),
    ...shared.map((d) => ({ ...d, type: 'shared' })),
  ];

  const filtered = allDocs.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(query);
    if (activeTab === 'owned') return matchesSearch && doc.type === 'owned';
    if (activeTab === 'shared') return matchesSearch && doc.type === 'shared';
    return matchesSearch;
  });

  const roleIcon = (role) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-amber-500" />;
    if (role === 'edit') return <Edit3 className="w-3 h-3 text-green-500" />;
    return <Eye className="w-3 h-3 text-blue-500" />;
  };

  const roleLabel = (role) => {
    if (role === 'owner') return 'Owner';
    if (role === 'edit') return 'Can edit';
    return 'Can view';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">DocStyle</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              @{user?.username}
            </span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New document
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg text-sm border border-gray-300 transition-colors disabled:opacity-60"
          >
            <Upload className="w-4 h-4" />
            {uploading ? 'Importing…' : 'Import file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Import .txt or .md file"
          />
          <p className="text-xs text-gray-400 hidden sm:block">Supports .txt and .md</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search + Tabs */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'all', label: `All (${allDocs.length})` },
              { id: 'owned', label: `My docs (${owned.length})` },
              { id: 'shared', label: `Shared (${shared.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Document grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded mb-3 w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? 'No documents match your search' : 'No documents yet'}
            </p>
            {!search && (
              <p className="text-gray-400 text-sm mt-1">
                Create a new document or import a file to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer relative"
                onClick={() => navigate(`/docs/${doc.id}`)}
              >
                <div className="p-5">
                  {/* Doc type badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      {roleIcon(doc.role)}
                      <span className="text-xs text-gray-400 font-medium">
                        {roleLabel(doc.role)}
                      </span>
                    </div>
                    {doc.type === 'owned' && doc.shareCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Users className="w-3 h-3" />
                        {doc.shareCount}
                      </div>
                    )}
                    {doc.type === 'shared' && (
                      <span className="text-xs text-gray-400">by @{doc.owner?.username}</span>
                    )}
                  </div>

                  <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-3">
                    {doc.title}
                  </h3>

                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Delete button (owner only) */}
                {doc.type === 'owned' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(doc);
                    }}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                    aria-label="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete document?</h2>
            <p className="text-sm text-gray-500 mb-5">
              "<span className="font-medium text-gray-700">{deleteConfirm.title}</span>" will be
              permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
