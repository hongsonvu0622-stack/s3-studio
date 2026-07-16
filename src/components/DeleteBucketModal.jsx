import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

export default function DeleteBucketModal({ isOpen, onClose, bucketName, onDelete }) {
  if (!isOpen) return null;

  const [isChecked, setIsChecked] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsChecked(false);
      setTypedName('');
      setDeleting(false);
    }
  }, [isOpen, bucketName]);

  const isValid = isChecked && typedName === bucketName && !deleting;

  const handleDelete = async () => {
    if (!isValid) return;
    setDeleting(true);
    try {
      await onDelete(bucketName);
      onClose();
    } catch (err) {
      // Lỗi đã được Toast xử lý ở component cha, chỉ tắt trạng thái deleting
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-red-500/30 flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-red-500/10">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Xác nhận Xóa Bucket (2-Step Verification)</h2>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm">
          <div className="bg-red-500/15 border border-red-500/40 p-4 rounded-xl flex items-start space-x-3 text-red-950 dark:text-red-200 text-xs leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-900 dark:text-red-300 mb-1 text-sm">Cảnh báo rủi ro mất dữ liệu vĩnh viễn!</p>
              <p className="text-red-900 dark:text-red-200 font-medium">
                Xóa Bucket là hành động không thể hoàn tác. Toàn bộ cấu trúc, chính sách quyền (ACL/Policy), cấu hình Versioning và dữ liệu bên trong Bucket sẽ bị hủy hoặc yêu cầu Bucket phải rỗng trước khi xóa.
              </p>
            </div>
          </div>

          {/* Bước 1: Checkbox xác nhận */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider block">
              Bước 1: Xác nhận hiểu rõ rủi ro
            </span>
            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-border bg-surface hover:border-gray-500 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                disabled={deleting}
                className="w-4 h-4 mt-0.5 text-red-600 border-border rounded focus:ring-0 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-900 dark:text-gray-200 select-none leading-normal">
                Tôi hiểu rằng hành động này sẽ xóa vĩnh viễn Bucket <span className="font-bold text-slate-950 dark:text-white font-mono bg-slate-500/10 dark:bg-white/10 px-1 py-0.5 rounded">{bucketName}</span> và không thể khôi phục.
              </span>
            </label>
          </div>

          {/* Bước 2: Gõ tên xác nhận */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider block">
              Bước 2: Gõ chính xác tên Bucket để xác nhận
            </span>
            <div>
              <label className="block text-xs font-medium text-slate-800 dark:text-gray-300 mb-1.5">
                Vui lòng nhập chính xác chuỗi <span className="font-mono font-bold text-red-800 dark:text-red-300 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30">{bucketName}</span> vào ô bên dưới:
              </label>
              <input
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                disabled={deleting}
                placeholder={bucketName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValid) {
                    handleDelete();
                  }
                }}
                className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm text-slate-950 dark:text-white font-mono font-bold placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-6 border-t border-border bg-black/10 dark:bg-black/20 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-semibold text-slate-700 dark:text-gray-300 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleDelete}
            disabled={!isValid}
            className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white shadow-lg flex items-center space-x-2 transition-all"
          >
            <Trash2 className="w-4 h-4 text-white" />
            <span className="text-white">{deleting ? 'Đang xóa Bucket...' : 'Xóa Bucket vĩnh viễn'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
