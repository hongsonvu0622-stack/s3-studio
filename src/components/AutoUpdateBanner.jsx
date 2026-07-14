import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';

export default function AutoUpdateBanner() {
  const [status, setStatus] = useState('idle'); // idle | checking | available | downloading | ready | error
  const [progress, setProgress] = useState({ percent: 0 });
  const [updateInfo, setUpdateInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubChecking = window.electronAPI.onUpdaterChecking?.(() => {
      setStatus('checking');
      setDismissed(false);
    });

    const unsubAvailable = window.electronAPI.onUpdaterAvailable?.((info) => {
      setStatus('available');
      setUpdateInfo(info);
      setDismissed(false);
    });

    const unsubNotAvailable = window.electronAPI.onUpdaterNotAvailable?.(() => {
      setStatus('idle');
    });

    const unsubProgress = window.electronAPI.onUpdaterProgress?.((prog) => {
      setStatus('downloading');
      setProgress(prog || { percent: 0 });
      setDismissed(false);
    });

    const unsubDownloaded = window.electronAPI.onUpdaterDownloaded?.((info) => {
      setStatus('ready');
      setUpdateInfo(info);
      setDismissed(false);
    });

    const unsubError = window.electronAPI.onUpdaterError?.((err) => {
      setStatus('error');
      setErrorMessage(typeof err === 'string' ? err : err?.message || 'Lỗi kiểm tra cập nhật');
    });

    return () => {
      unsubChecking?.();
      unsubAvailable?.();
      unsubNotAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, []);

  const handleDownloadUpdate = () => {
    if (window.confirm(`Phát hiện phiên bản mới v${updateInfo?.version || ''}. Bạn có đồng ý tải xuống bản cập nhật này không?`)) {
      setStatus('downloading');
      setProgress({ percent: 0 });
      if (window.electronAPI?.startDownloadUpdate) {
        window.electronAPI.startDownloadUpdate();
      }
    }
  };

  const handleRestart = () => {
    if (window.confirm(`Bản cập nhật v${updateInfo?.version || ''} đã sẵn sàng! Bạn có đồng ý đóng ứng dụng và cài đặt bản cập nhật ngay lập tức không?`)) {
      if (window.electronAPI?.restartAndInstallUpdate) {
        window.electronAPI.restartAndInstallUpdate();
      }
    }
  };

  if (dismissed || status === 'idle' || status === 'checking') return null;

  return (
    <div className="z-50 px-4 py-2 bg-gradient-to-r from-primary-900/90 via-purple-900/90 to-primary-900/90 border-b border-primary-500/30 backdrop-blur-md text-white flex items-center justify-between shadow-lg animate-fade-in">
      <div className="flex items-center space-x-3 text-sm">
        {status === 'available' && (
          <>
            <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse flex-shrink-0" />
            <span>
              Phát hiện phiên bản mới <strong>v{updateInfo?.version || 'Mới'}</strong>! Bạn có muốn tải xuống và nâng cấp ngay không?
            </span>
          </>
        )}

        {status === 'downloading' && (
          <>
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
            <div className="flex items-center space-x-2">
              <span>Đang tải bản cập nhật ngầm: <strong>{progress.percent ? `${progress.percent.toFixed(1)}%` : 'Đang tải...'}</strong></span>
              <div className="w-24 bg-gray-700/60 rounded-full h-1.5 overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-purple-400 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percent || 0}%` }}
                ></div>
              </div>
            </div>
          </>
        )}

        {status === 'ready' && (
          <>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 animate-bounce" />
            <span>
              🎉 Bản cập nhật <strong>v{updateInfo?.version || 'Mới'}</strong> đã tải xuống hoàn tất! Bạn có muốn khởi động lại ngay để áp dụng?
            </span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex flex-col text-xs">
              {errorMessage?.includes('Code signature') || errorMessage?.includes('validation') || errorMessage?.includes('ShipIt') ? (
                <span className="text-yellow-200 font-medium">
                  ⚠️ macOS yêu cầu chữ ký Apple Developer ($99/năm) để tự động cập nhật bundle ngầm. Vui lòng nhấn nút tải bên phải (.dmg) để cài bản mới!
                </span>
              ) : (
                <span className="text-red-200">Không thể tải bản cập nhật ngầm: {errorMessage}</span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {status === 'available' && (
          <button
            onClick={handleDownloadUpdate}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 animate-bounce" />
            <span>Tải & Cập nhật ngay</span>
          </button>
        )}

        {status === 'ready' && (
          <button
            onClick={handleRestart}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Khởi động lại ngay</span>
          </button>
        )}

        {(status === 'error' || status === 'available') && (
          <button
            onClick={() => {
              if (window.electronAPI?.openExternal) {
                window.electronAPI.openExternal('https://github.com/hongsonvu0622-stack/s3-studio/releases/latest');
              } else {
                window.open('https://github.com/hongsonvu0622-stack/s3-studio/releases/latest', '_blank');
              }
            }}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/20 transition-all shadow-sm"
          >
            <span>Tải trực tiếp từ GitHub (.dmg/.exe)</span>
          </button>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Đóng thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
