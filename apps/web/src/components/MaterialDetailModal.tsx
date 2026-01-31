import { useState } from 'react';
import type { RawMaterial } from '../lib/store/materials';

interface MaterialDetailModalProps {
  material: RawMaterial;
  onClose: () => void;
  onUpdate: (id: string, content: string, note?: string) => void;
  onDelete: (id: string) => void;
}

export function MaterialDetailModal({
  material,
  onClose,
  onUpdate,
  onDelete,
}: MaterialDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(material.content);
  const [note, setNote] = useState(material.note || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    onUpdate(material.id, content, note || undefined);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(material.id);
  };

  const handleCancel = () => {
    setContent(material.content);
    setNote(material.note || '');
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-echo-text">
              {isEditing ? 'Edit Material' : 'Material Detail'}
            </h2>
            <p className="text-echo-hint text-sm mt-1">
              {new Date(material.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-echo-hint hover:text-echo-muted transition-colors"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-echo-muted text-sm mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-48 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-echo-text text-echo-text leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-echo-muted text-sm mb-2">
                  Personal Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note to help you remember the context..."
                  className="w-full h-24 p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-echo-text text-echo-text"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-echo-text leading-relaxed whitespace-pre-wrap">
                  {material.content}
                </p>
              </div>
              {material.note && (
                <div className="border-l-2 border-echo-accent pl-4">
                  <p className="text-echo-hint text-xs uppercase tracking-wide mb-1">
                    Your Note
                  </p>
                  <p className="text-echo-muted italic">{material.note}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          {showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <p className="text-red-600 text-sm">
                Are you sure you want to delete this material?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-echo-muted hover:text-echo-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-echo-muted hover:text-echo-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-echo-text text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="flex justify-between">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-echo-text text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
