import React, { useState, useEffect } from 'react';
import { Info, X, Copy, Check, HardDrive, Calendar, Tag, Shield, Globe, FileText, Lock, Clock } from 'lucide-react';
import { showToast } from './Toast';

function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function ObjectPropertiesModal({ isOpen, onClose, bucket, objectKey }) {
  if (!isOpen || !objectKey) return null;

  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && bucket && objectKey && window.electronAPI) {
      setLoading(true);
      setError(null);
      setMetadata(null);
      setPublicUrl('');

      // Tải metadata file
      if (window.electronAPI.getObjectMetadata) {
        window.electronAPI
          .getObjectMetadata(bucket, objectKey)
          .then((res) => setMetadata(res))
          .catch((err) => {
            console.error('[DEBUG METADATA] Error:', err);
            setError(err.message || 'Không thể đọc thông tin thuộc tính tệp');
          })
          .finally(() => setLoading(false));
      }

      // Tải Public URL
      if (window.electronAPI.getPublicUrl) {
        window.electronAPI
          .getPublicUrl(bucket, objectKey)
          .then((url) => setPublicUrl(url))
          .catch(() => {});
      }
    }
  }, [isOpen, bucket, objectKey]);

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-card w-full max-w-xl rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl max-h-[88vh]">
        {/* Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-primary-400" />
            <h2 className="text-base font-semibold text-white">Thuộc tính & Metadata Tập tin</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
          {/* Object Header Info */}
          <div className="p-3.5 rounded-xl bg-surface border border-border flex items-start justify-between space-x-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-400">Tập tin (Object Key):</div>
              <div className="font-mono text-xs font-semibold text-primary-300 break-all mt-0.5">{objectKey}</div>
              <div className="text-[11px] text-gray-400 mt-1">Bucket: <span className="text-white font-medium">{bucket}</span></div>
            </div>
            <button
              onClick={() => handleCopy(objectKey, 'Object Key')}
              className="p-1.5 rounded-lg bg-surface-hover hover:bg-white/10 text-gray-300 transition-colors shrink-0"
              title="Sao chép tên tệp"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-7 h-7 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Đang đọc thông tin tập tin từ máy chủ...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {!loading && metadata && (
            <>
              {/* Properties Grid */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary-400" />
                  <span>Thông số tập tin (Properties)</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-surface/60 border border-border">
                    <div className="text-[11px] text-gray-400 flex items-center space-x-1">
                      <HardDrive className="w-3 h-3 text-emerald-400" />
                      <span>Dung lượng:</span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-1">
                      {formatBytes(metadata.contentLength)}
                      <span className="text-[10px] text-gray-400 font-normal ml-1.5">
                        ({metadata.contentLength?.toLocaleString()} bytes)
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface/60 border border-border">
                    <div className="text-[11px] text-gray-400">Loại nội dung (MIME Type):</div>
                    <div className="text-xs font-semibold text-white mt-1 truncate" title={metadata.contentType}>
                      {metadata.contentType || 'application/octet-stream'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface/60 border border-border">
                    <div className="text-[11px] text-gray-400 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span>Cập nhật lần cuối:</span>
                    </div>
                    <div className="text-xs font-semibold text-white mt-1">
                      {metadata.lastModified ? new Date(metadata.lastModified).toLocaleString() : 'N/A'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface/60 border border-border">
                    <div className="text-[11px] text-gray-400">Storage Class:</div>
                    <div className="text-xs font-semibold text-emerald-300 mt-1">
                      {metadata.storageClass}
                    </div>
                  </div>
                </div>
              </div>

              {/* Checksum & Encryption */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bảo mật & Mã băm (Checksum / ETag)</span>
                </h3>
                <div className="p-3.5 rounded-xl bg-surface/60 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">ETag (MD5 Checksum):</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-amber-300 font-semibold">{metadata.eTag || 'N/A'}</span>
                      {metadata.eTag && (
                        <button
                          onClick={() => handleCopy(metadata.eTag, 'ETag')}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                    <span className="text-gray-400">Mã hóa phía máy chủ (SSE):</span>
                    <span className="font-medium text-white">{metadata.serverSideEncryption}</span>
                  </div>

                  {metadata.versionId && (
                    <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                      <span className="text-gray-400">Version ID:</span>
                      <span className="font-mono text-primary-300">{metadata.versionId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lifecycle Expiration (x-amz-expiration) */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thời hạn tự động xóa (Lifecycle Expiration / x-amz-expiration)</span>
                </h3>
                {metadata.expiration ? (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                    {metadata.expirationDetails && metadata.expirationDetails.expiryDate && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-200/80">Ngày hết hạn (Expiry Date):</span>
                        <span className="font-semibold text-amber-300">
                          {metadata.expirationDetails.expiryDate}
                        </span>
                      </div>
                    )}
                    {metadata.expirationDetails && metadata.expirationDetails.ruleId && (
                      <div className="flex items-center justify-between text-xs border-t border-amber-500/20 pt-2">
                        <span className="text-amber-200/80">Quy tắc Lifecycle (Rule ID):</span>
                        <span className="font-mono font-medium text-amber-200">
                          {metadata.expirationDetails.ruleId}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-amber-500/20 pt-2">
                      <div className="text-[11px] text-amber-200/70 mb-1">Raw Header (x-amz-expiration):</div>
                      <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-lg font-mono text-[11px] text-amber-300 break-all">
                        <span>{metadata.expiration}</span>
                        <button
                          onClick={() => handleCopy(metadata.expiration, 'x-amz-expiration')}
                          className="ml-2 p-1 text-amber-400 hover:text-white shrink-0"
                          title="Sao chép"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-surface/30 border border-border text-xs text-gray-400 text-center italic">
                    Tập tin này không có lịch xóa tự động (Không có header x-amz-expiration)
                  </div>
                )}
              </div>

              {/* Custom User Metadata */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-purple-400" />
                  <span>Custom User Metadata (x-amz-meta-*)</span>
                </h3>
                {metadata.metadata && Object.keys(metadata.metadata).length > 0 ? (
                  <div className="p-3 rounded-xl bg-surface/60 border border-border space-y-1.5">
                    {Object.entries(metadata.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                        <span className="font-mono text-purple-300">{k}:</span>
                        <span className="text-white font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-surface/30 border border-border text-xs text-gray-400 text-center italic">
                    Tập tin này không có Custom User Metadata nào
                  </div>
                )}
              </div>

              {/* Public Share Link */}
              {publicUrl && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đường dẫn truy cập (Direct URL)</span>
                  </h3>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={publicUrl}
                      className="flex-1 bg-black/40 border border-border rounded-lg px-3 py-1.5 font-mono text-[11px] text-gray-300 select-all focus:outline-none"
                    />
                    <button
                      onClick={() => handleCopy(publicUrl, 'URL')}
                      className="px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs text-white flex items-center space-x-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-6 border-t border-border bg-black/20 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
