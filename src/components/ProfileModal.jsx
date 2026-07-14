import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Plus, Trash2, X, ShieldAlert, Server, Globe } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose, profiles, onSaveProfiles, onSelectProfile }) {
  if (!isOpen) return null;

  const [selectedId, setSelectedId] = useState(profiles[0]?.id || null);
  const [editingProfile, setEditingProfile] = useState(
    profiles[0] || {
      id: '',
      name: '',
      endpoint: '',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      forcePathStyle: true,
      ignoreSsl: true
    }
  );

  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const handleNewProfile = () => {
    const newP = {
      id: `p-${Date.now()}`,
      name: 'New S3 Profile',
      endpoint: '',
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
      forcePathStyle: true,
      ignoreSsl: true
    };
    setSelectedId(newP.id);
    setEditingProfile(newP);
    setTestResult(null);
  };

  const handleSelectProfile = (p) => {
    setSelectedId(p.id);
    setEditingProfile({ ...p });
    setTestResult(null);
  };

  const handleDeleteProfile = (id) => {
    if (profiles.length <= 1) {
      alert('Phải giữ lại ít nhất 1 Profile!');
      return;
    }
    const filtered = profiles.filter((p) => p.id !== id);
    onSaveProfiles(filtered);
    if (selectedId === id) {
      handleSelectProfile(filtered[0]);
    }
  };

  const handleSaveCurrent = () => {
    if (!editingProfile.name || !editingProfile.accessKeyId || !editingProfile.secretAccessKey) {
      alert('Vui lòng nhập đầy đủ Tên, Access Key ID và Secret Key');
      return;
    }
    const updated = profiles.map((p) => (p.id === editingProfile.id ? editingProfile : p));
    if (!profiles.some((p) => p.id === editingProfile.id)) {
      updated.push(editingProfile);
    }
    onSaveProfiles(updated);
    if (onSelectProfile) {
      onSelectProfile(editingProfile.id);
    }
    alert('Đã lưu cấu hình Profile S3!');
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const list = await window.electronAPI.testS3Connection(editingProfile);
      setTestResult({
        success: true,
        message: `Kết nối thành công! Tìm thấy ${list.length} Buckets.`
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.message || 'Lỗi kết nối tới máy chủ S3.'
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen || !editingProfile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="glass-card w-full max-w-4xl h-[620px] rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-semibold text-white">Quản lý Tài khoản & Kết nối S3</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Profiles List */}
          <div className="w-64 border-r border-border bg-black/20 flex flex-col">
            <div className="p-3 border-b border-border flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Profiles</span>
                <button
                  onClick={handleNewProfile}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mới</span>
                </button>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await window.electronAPI.importRcloneConfig();
                    onSaveProfiles(res.profiles);
                    alert(`Đã nhập thành công ${res.importedCount} Profile S3 từ rclone.conf!`);
                  } catch (err) {
                    alert('Lỗi nhập rclone.conf: ' + err.message);
                  }
                }}
                className="w-full py-1.5 rounded-md bg-surface hover:bg-surface-hover border border-border text-accent-400 text-xs font-medium transition-colors"
                title="Tự động đọc ~/.config/rclone/rclone.conf"
              >
                ⚡ Nhập từ Rclone (rclone.conf)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectProfile(p)}
                  className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                    selectedId === p.id
                      ? 'bg-primary-600/20 border border-primary-500/30 text-white'
                      : 'hover:bg-surface text-gray-300'
                  }`}
                >
                  <div className="truncate">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {p.endpoint || 'AWS Official S3'}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProfile(p.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Tên hiển thị Profile</label>
                <input
                  type="text"
                  value={editingProfile.name}
                  onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                  placeholder="VD: My S3 Cluster / MinIO"
                  className="w-full bg-surface border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Endpoint URL (Để trống nếu dùng AWS S3 chuẩn)
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={editingProfile.endpoint || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, endpoint: e.target.value })}
                    placeholder="VD: http://192.168.1.100:9000 hoặc https://s3.company.com"
                    className="w-full bg-surface border border-border rounded-lg pl-10 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Access Key ID</label>
                <input
                  type="text"
                  value={editingProfile.accessKeyId}
                  onChange={(e) => setEditingProfile({ ...editingProfile, accessKeyId: e.target.value })}
                  placeholder="AKIA..."
                  className="w-full bg-surface border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Secret Access Key</label>
                <input
                  type="password"
                  value={editingProfile.secretAccessKey}
                  onChange={(e) => setEditingProfile({ ...editingProfile, secretAccessKey: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full bg-surface border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Region</label>
                <input
                  type="text"
                  value={editingProfile.region || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, region: e.target.value })}
                  placeholder="us-east-1"
                  className="w-full bg-surface border border-border rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* S3 Compatible Advanced Options */}
            <div className="p-4 rounded-xl bg-surface/50 border border-border space-y-3">
              <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider block">
                Tối ưu kết nối S3 & Mạng nội bộ
              </span>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProfile.forcePathStyle ?? true}
                  onChange={(e) => setEditingProfile({ ...editingProfile, forcePathStyle: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-0 cursor-pointer"
                />
                <div className="text-sm">
                  <span className="font-medium text-gray-200">Bắt buộc Path-Style Addressing (`forcePathStyle`)</span>
                  <p className="text-xs text-gray-400">
                    Khuyến nghị bật cho các hệ thống S3-compatible (`http://endpoint/bucket/object`).
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProfile.ignoreSsl ?? true}
                  onChange={(e) => setEditingProfile({ ...editingProfile, ignoreSsl: e.target.checked })}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-0 cursor-pointer"
                />
                <div className="text-sm">
                  <span className="font-medium text-gray-200">Bỏ qua lỗi chứng chỉ SSL / TLS (Self-Signed SSL)</span>
                  <p className="text-xs text-gray-400">
                    Cho phép kết nối với máy chủ nội bộ sử dụng chứng chỉ tự ký.
                  </p>
                </div>
              </label>
            </div>

            {/* Test Connection Banner */}
            {testResult && (
              <div
                className={`p-3.5 rounded-xl border flex items-center space-x-3 text-sm ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-16 px-6 border-t border-border bg-black/20 flex items-center justify-between shrink-0">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-sm font-medium text-gray-200 transition-colors disabled:opacity-50"
          >
            {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối (Test Connection)'}
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-sm font-medium text-gray-300 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveCurrent}
              className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-sm font-medium text-white shadow-lg shadow-primary-500/20 transition-all"
            >
              Lưu & Kết nối
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
