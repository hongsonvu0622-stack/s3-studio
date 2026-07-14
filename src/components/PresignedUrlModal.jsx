import React, { useState } from 'react';
import { Share2, Copy, Check, X, Clock } from 'lucide-react';

export default function PresignedUrlModal({ isOpen, onClose, bucket, objectKey }) {
  if (!isOpen) return null;

  const [expiresIn, setExpiresIn] = useState(3600); // 1 giờ
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const url = await window.electronAPI.generatePresignedUrl(bucket, objectKey, expiresIn);
      setGeneratedUrl(url);
    } catch (err) {
      alert('Lỗi tạo Presigned URL: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-card w-full max-w-xl rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-accent-400" />
            <h2 className="text-base font-semibold text-white">Tạo Presigned URL Chia sẻ Tập tin</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          <div>
            <span className="text-xs text-gray-400">Tập tin:</span>
            <div className="font-mono text-xs text-accent-300 mt-1 truncate bg-surface p-2 rounded border border-border">
              {bucket}/{objectKey}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Thời hạn hiệu lực:</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '15 Phút', sec: 900 },
                { label: '1 Giờ', sec: 3600 },
                { label: '1 Ngày', sec: 86400 },
                { label: '7 Ngày', sec: 604800 }
              ].map((opt) => (
                <button
                  key={opt.sec}
                  onClick={() => setExpiresIn(opt.sec)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                    expiresIn === opt.sec
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-surface border-border text-gray-300 hover:bg-surface-hover'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {generatedUrl ? (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-emerald-400">Đường dẫn chia sẻ (Presigned URL):</span>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={generatedUrl}
                  className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shrink-0"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-xs font-semibold text-white shadow-lg transition-all"
              >
                {loading ? 'Đang tạo link...' : 'Tạo đường dẫn chia sẻ ngay'}
              </button>
            </div>
          )}
        </div>

        <div className="h-14 px-6 border-t border-border bg-black/20 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
