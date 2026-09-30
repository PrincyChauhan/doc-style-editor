import React, { useState } from 'react';
import { X, UserPlus, Trash2, Crown, Edit3, Eye, Users, Copy, Check } from 'lucide-react';
import { shareDocument, revokeShare } from '../api/documents';

export default function SharePanel({ doc, onClose, onUpdate }) {
  const [form, setForm] = useState({ usernameOrEmail: '', permission: 'view' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await shareDocument(doc.id, form);
      setForm({ usernameOrEmail: '', permission: 'view' });
      onUpdate(); // Refresh doc data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId) => {
    try {
      await revokeShare(doc.id, shareId);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke access');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-end z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mt-14 flex flex-col max-h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Share document</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label="Close share panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Add user form */}
          <form onSubmit={handleShare}>
            <p className="text-sm font-medium text-gray-700 mb-2">Add people</p>
            {error && (
              <p className="text-xs text-red-600 mb-2 p-2 bg-red-50 rounded-lg">{error}</p>
            )}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Username or email"
                value={form.usernameOrEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, usernameOrEmail: e.target.value }))
                }
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={form.permission}
                onChange={(e) =>
                  setForm((f) => ({ ...f, permission: e.target.value }))
                }
                className="px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="view">Viewer</option>
                <option value="edit">Editor</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || !form.usernameOrEmail.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Sharing…' : 'Share'}
            </button>
          </form>

          {/* People with access */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">People with access</p>
            <div className="space-y-2">
              {/* Owner row */}
              <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                    <Crown className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.owner?.username}</p>
                    <p className="text-xs text-gray-400">{doc.owner?.email}</p>
                  </div>
                </div>
                <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                  Owner
                </span>
              </div>

              {/* Shared users */}
              {doc.shares?.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">
                  Only you have access
                </p>
              )}
              {doc.shares?.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-blue-600">
                        {share.user.username?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{share.user.username}</p>
                      <p className="text-xs text-gray-400">{share.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {share.permission === 'edit' ? (
                        <Edit3 className="w-3 h-3 text-green-500" />
                      ) : (
                        <Eye className="w-3 h-3 text-blue-500" />
                      )}
                      {share.permission === 'edit' ? 'Editor' : 'Viewer'}
                    </div>
                    <button
                      onClick={() => handleRevoke(share.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Revoke access for ${share.user.username}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copy link */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Share link</p>
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Link copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy link to document
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
