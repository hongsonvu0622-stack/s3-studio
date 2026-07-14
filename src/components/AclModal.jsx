import React, { useState, useEffect } from 'react';
import { Shield, X, AlertCircle, Copy, Check, Globe, ExternalLink } from 'lucide-react';
import { showToast } from './Toast';

const CANNED_ACLS = [
  { id: 'private', title: 'Private (Riêng tư)', desc: 'Chỉ chủ sở hữu (Owner) có quyền truy cập.' },
  { id: 'public-read', title: 'Public Read (Đọc công khai)', desc: 'Bất kỳ ai cũng có thể đọc tập tin qua URL công khai không cần chữ ký.' }
];

export default function AclModal({ isOpen, onClose, bucket, objectKey, onSaveAcl }) {
  if (!isOpen) return null;

  const [cannedAcl, setCannedAcl] = useState('private');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && objectKey && window.electronAPI) {
      setLoading(true);
      setError(null);
      setPublicUrl('');

      // Tải ACL hiện tại
      if (window.electronAPI.getObjectAcl) {
        window.electronAPI
          .getObjectAcl(bucket, objectKey)
          .then((res) => {
            console.log('[DEBUG ACL UI] Loaded current ACL:', res);
            if (res && res.detectedAcl) {
              setCannedAcl(res.detectedAcl);
            } else {
              setCannedAcl('private');
            }
          })
          .catch((err) => {
            console.warn('[DEBUG ACL UI] Could not load current ACL:', err);
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }

      // Tải Public URL trực tiếp của file
      if (window.electronAPI.getPublicUrl) {
        window.electronAPI
          .getPublicUrl(bucket, objectKey)
          .then((url) => setPublicUrl(url))
          .catch((err) => console.warn('[DEBUG ACL UI] Could not get public url:', err));
      }
    } else {
      setCannedAcl('private');
      setError(null);
      setPublicUrl('');
    }
  }, [isOpen, bucket, objectKey]);

  const isPublicSelection = cannedAcl === 'public-read';

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    console.log('[DEBUG ACL UI] Starting save ACL ->', { bucket, objectKey, cannedAcl });
    try {
      if (objectKey && window.electronAPI && window.electronAPI.putObjectAcl) {
        const result = await window.electronAPI.putObjectAcl(bucket, objectKey, cannedAcl);
        console.log('[DEBUG ACL UI] putObjectAcl result:', result);
      } else if (onSaveAcl) {
        await onSaveAcl(bucket, cannedAcl);
      } else if (window.electronAPI && window.electronAPI.putBucketAcl) {
        await window.electronAPI.putBucketAcl(bucket, cannedAcl);
      }
      showToast(
        objectKey
          ? `Cập nhật quyền ACL cho tập tin "${objectKey}" thành công!`
          : `Cập nhật quyền ACL cho Bucket "${bucket}" thành công!`,
        'success'
      );
      onClose();
    } catch (err) {
      console.error('[DEBUG ACL UI] Error saving ACL:', err);
      const msg = err.message || 'Lỗi lưu Access Control List (ACL)';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl max-h-[88vh]">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">
              {objectKey ? 'Phân quyền ACL cho Tập tin' : 'Quản lý Access Control List (ACL)'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm flex-1">
          <div className="p-3 rounded-xl bg-surface border border-border text-xs text-gray-300">
            {objectKey ? (
              <div>
                <span>Bucket: </span>
                <span className="font-semibold text-white">{bucket}</span>
                <br />
                <span>Tập tin (Object Key): </span>
                <span className="font-mono text-emerald-300 font-semibold break-all">{objectKey}</span>
              </div>
            ) : (
              <div>
                Cấu hình quyền truy cập (Canned ACL) cho Bucket{' '}
                <span className="font-semibold text-white">{bucket}</span>
              </div>
            )}
          </div>

          {/* Đường dẫn Public Link để chia sẻ khi là Public Read / Public Read Write */}
          {objectKey && isPublicSelection && publicUrl && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                <div className="flex items-center space-x-1.5">
                  <Globe className="w-4 h-4" />
                  <span>Đường dẫn truy cập công khai trực tiếp (Public Link):</span>
                </div>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 hover:underline text-[11px]"
                >
                  <span>Mở thử</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={publicUrl}
                  className="flex-1 bg-black/40 border border-emerald-500/30 rounded-lg px-3 py-1.5 font-mono text-[11px] text-emerald-200 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                * Khi lưu với quyền Public Read, bất kỳ ai có đường dẫn trên đều có thể tải xuống không cần xác thực.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            {CANNED_ACLS.map((opt) => (
              <label
                key={opt.id}
                className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  cannedAcl === opt.id
                    ? 'bg-emerald-500/15 border-emerald-500/50'
                    : 'bg-surface/60 border-border hover:bg-surface'
                }`}
              >
                <input
                  type="radio"
                  name="acl"
                  checked={cannedAcl === opt.id}
                  onChange={() => setCannedAcl(opt.id)}
                  className="w-4 h-4 text-emerald-500 focus:ring-0 mt-0.5"
                />
                <div className="flex-1">
                  <span className="font-medium text-white block text-xs">{opt.title}</span>
                  <span className="text-[11px] text-gray-400">{opt.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="h-16 px-6 border-t border-border bg-black/20 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 flex items-center space-x-2"
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>{saving ? 'Đang áp dụng...' : 'Lưu quyền ACL'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
