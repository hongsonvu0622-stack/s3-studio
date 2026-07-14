import React, { useState, useEffect } from 'react';
import { FileText, X, Check, Trash2, Code } from 'lucide-react';

export default function PolicyEditorModal({ isOpen, onClose, bucket, policyText, onSavePolicy, onDeletePolicy }) {
  if (!isOpen) return null;

  const [jsonText, setJsonText] = useState(policyText || '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setJsonText(policyText || '');
  }, [policyText]);

  const applyTemplate = (type) => {
    if (type === 'public-read') {
      const t = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`]
          }
        ]
      };
      setJsonText(JSON.stringify(t, null, 2));
    }
  };

  const handleSave = async () => {
    if (!jsonText.trim()) {
      await onDeletePolicy(bucket);
      onClose();
      return;
    }

    try {
      JSON.parse(jsonText);
      setError(null);
    } catch (e) {
      setError('Cú pháp JSON không hợp lệ: ' + e.message);
      return;
    }

    setSaving(true);
    try {
      await onSavePolicy(bucket, jsonText);
      onClose();
    } catch (err) {
      setError('Lỗi lưu Policy: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-3xl h-[560px] rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Chỉnh sửa Bucket Policy JSON - {bucket}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-border bg-surface/50 flex items-center justify-between">
          <span className="text-xs text-gray-400">Chọn mẫu nhanh:</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => applyTemplate('public-read')}
              className="px-3 py-1 rounded bg-surface border border-border hover:bg-surface-hover text-xs text-amber-400 font-medium transition-colors"
            >
              Mẫu: Public Read Objects
            </button>
            <button
              onClick={() => setJsonText('')}
              className="px-3 py-1 rounded bg-surface border border-border hover:bg-surface-hover text-xs text-red-400 font-medium transition-colors"
            >
              Xóa trắng
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col overflow-hidden">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{\n  "Version": "2012-10-17",\n  "Statement": [...]\n}'
            className="flex-1 w-full bg-surface/90 border border-border rounded-xl p-4 font-mono text-xs text-gray-200 focus:outline-none focus:border-primary-500 resize-none"
          />

          {error && <div className="mt-2 text-xs text-red-400 bg-red-950/20 p-2.5 rounded-lg border border-red-500/30">{error}</div>}
        </div>

        <div className="h-16 px-6 border-t border-border bg-black/20 flex items-center justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300">
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-semibold text-white shadow-lg"
          >
            {saving ? 'Đang lưu...' : 'Lưu Bucket Policy'}
          </button>
        </div>
      </div>
    </div>
  );
}
