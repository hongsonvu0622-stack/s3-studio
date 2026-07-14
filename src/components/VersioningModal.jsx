import React, { useState, useEffect } from 'react';
import { FolderGit2, X, Check, ShieldAlert } from 'lucide-react';

export default function VersioningModal({ isOpen, onClose, bucket, status, onUpdateStatus }) {
  if (!isOpen) return null;

  const [currentStatus, setCurrentStatus] = useState(status || 'Suspended');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentStatus(status || 'Suspended');
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateStatus(currentStatus);
      onClose();
    } catch (err) {
      alert(`Lỗi cấu hình Versioning: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-md rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-accent-400" />
            <h2 className="text-base font-semibold text-white">Quản lý Phiên bản (Bucket Versioning)</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <p className="text-gray-300">
            Bucket: <span className="font-semibold text-white">{bucket}</span>
          </p>
          <p className="text-xs text-gray-400">
            Cấu hình Versioning cho phép S3 lưu giữ lại tất cả các phiên bản trước đó của một Object khi tập tin bị ghi đè hoặc xóa.
          </p>

          <div className="space-y-2 pt-2">
            <label className="flex items-center space-x-3 p-3 rounded-xl border border-border bg-surface cursor-pointer">
              <input
                type="radio"
                name="versioning"
                checked={currentStatus === 'Enabled'}
                onChange={() => setCurrentStatus('Enabled')}
                className="w-4 h-4 text-primary-600 focus:ring-0"
              />
              <div>
                <span className="font-medium text-white block">Enabled (Bật Versioning)</span>
                <span className="text-xs text-gray-400">Tất cả phiên bản tập tin sẽ được ghi nhận và có thể khôi phục.</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl border border-border bg-surface cursor-pointer">
              <input
                type="radio"
                name="versioning"
                checked={currentStatus === 'Suspended'}
                onChange={() => setCurrentStatus('Suspended')}
                className="w-4 h-4 text-primary-600 focus:ring-0"
              />
              <div>
                <span className="font-medium text-white block">Suspended (Tạm dừng Versioning)</span>
                <span className="text-xs text-gray-400">Dừng tạo thêm phiên bản mới khi thao tác tập tin.</span>
              </div>
            </label>
          </div>
        </div>

        <div className="h-16 px-6 border-t border-border bg-black/20 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-semibold text-white shadow-lg"
          >
            {saving ? 'Đang lưu...' : 'Lưu Cấu hình'}
          </button>
        </div>
      </div>
    </div>
  );
}
