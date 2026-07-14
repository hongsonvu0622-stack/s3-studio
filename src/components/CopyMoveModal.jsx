import React, { useState, useEffect } from 'react';
import { Copy, FolderInput, X, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CopyMoveModal({ isOpen, onClose, mode, sourceBucket, sourceKey, onSuccess }) {
  if (!isOpen) return null;

  const [destBucket, setDestBucket] = useState(sourceBucket);
  const [destKey, setDestKey] = useState(sourceKey);
  const [buckets, setBuckets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBuckets() {
      if (!window.electronAPI?.listBuckets) return;
      try {
        const list = await window.electronAPI.listBuckets();
        setBuckets(list || []);
      } catch (err) {
        console.error('Error loading buckets:', err);
      }
    }
    loadBuckets();
    setDestBucket(sourceBucket);
    setDestKey(mode === 'COPY' ? `copy-${sourceKey}` : sourceKey);
  }, [sourceBucket, sourceKey, mode, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!destBucket || !destKey) {
      setError('Vui lòng điền đầy đủ Bucket đích và tên tệp đích.');
      return;
    }
    if (sourceBucket === destBucket && sourceKey === destKey) {
      setError('Đường dẫn đích phải khác đường dẫn gốc.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === 'COPY') {
        await window.electronAPI.copyObject(sourceBucket, sourceKey, destBucket, destKey);
      } else {
        await window.electronAPI.moveObject(sourceBucket, sourceKey, destBucket, destKey);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi thực hiện thao tác');
    } finally {
      setLoading(false);
    }
  };

  const isCopy = mode === 'COPY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isCopy ? (
              <Copy className="w-5 h-5 text-primary-400" />
            ) : (
              <FolderInput className="w-5 h-5 text-accent-400" />
            )}
            <h3 className="font-semibold text-gray-100">
              {isCopy ? 'Sao chép tập tin' : 'Di chuyển tập tin'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 rounded-lg bg-surface/60 border border-border/60 text-xs text-gray-300">
            <div className="text-gray-400 mb-1">Tập tin nguồn:</div>
            <div className="font-mono text-gray-200 truncate">
              {sourceBucket} / {sourceKey}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Bucket đích
            </label>
            <select
              value={destBucket}
              onChange={(e) => setDestBucket(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-gray-200 text-sm focus:border-primary-500 focus:outline-none"
            >
              {buckets.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
              {buckets.length === 0 && <option value={sourceBucket}>{sourceBucket}</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Đường dẫn / Tên tập tin đích
            </label>
            <input
              type="text"
              value={destKey}
              onChange={(e) => setDestKey(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-gray-200 text-sm font-mono focus:border-primary-500 focus:outline-none"
              placeholder="ví dụ: backup/file.txt"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-300 hover:bg-surface transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 rounded-lg text-sm font-medium text-white flex items-center space-x-2 shadow-lg transition-all ${
                isCopy
                  ? 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/20'
                  : 'bg-accent-600 hover:bg-accent-500 shadow-accent-500/20'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isCopy ? 'Xác nhận Sao chép' : 'Xác nhận Di chuyển'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
