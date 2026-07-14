import React from 'react';
import { Database, Plus, RefreshCw, Server, Settings, ShieldCheck, Sun, Moon } from 'lucide-react';

export default function Header({
  profiles,
  currentProfile,
  onSelectProfile,
  onOpenProfileModal,
  onRefresh,
  isConnected,
  theme,
  onToggleTheme
}) {
  return (
    <header className="glass-header h-14 px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Brand & Title */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <Database className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-base tracking-tight text-white">S3 Studio</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-500/10 text-accent-400 border border-accent-500/20">
            S3 Storage
          </span>
        </div>
      </div>

      {/* Account Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center bg-surface border border-border rounded-lg p-1 space-x-2">
          <Server className="w-4 h-4 text-gray-400 ml-2" />
          <select
            value={currentProfile?.id || ''}
            onChange={(e) => onSelectProfile(e.target.value)}
            className="bg-transparent text-sm font-medium text-gray-200 focus:outline-none pr-3 py-1 cursor-pointer"
          >
            {profiles.length === 0 && <option value="">Chưa có Profile</option>}
            {profiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface text-gray-100">
                {p.name} ({p.endpoint || 'AWS S3'})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onOpenProfileModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-sm text-gray-300 hover:text-white transition-colors shadow-sm"
        >
          <Settings className="w-4 h-4" />
          <span>Quản lý Tài khoản</span>
        </button>

        <button
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Chuyển sang Giao diện Tối (Dark Mode)' : 'Chuyển sang Giao diện Sáng (Light Mode)'}
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-gray-300 hover:text-white transition-all duration-200"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-primary-500" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        <button
          onClick={onRefresh}
          title="Làm mới kết nối & danh sách"
          className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Connection status badge */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isConnected
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isConnected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
        </div>
      </div>
    </header>
  );
}
