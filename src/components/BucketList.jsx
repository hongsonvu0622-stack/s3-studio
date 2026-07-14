import React, { useState, useEffect } from 'react';
import { Database, Plus, Search, Trash2, FolderGit2, Shield, FileText, Activity, MoreVertical } from 'lucide-react';

export default function BucketList({
  buckets,
  selectedBucket,
  onSelectBucket,
  onCreateBucket,
  onDeleteBucket,
  onOpenPolicyModal,
  onOpenAclModal,
  onOpenLifecycleModal,
  onOpenVersioningModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [newBucketName, setNewBucketName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeBucketMenu, setActiveBucketMenu] = useState(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveBucketMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setActiveBucketMenu(null);
    });
    return () => {
      window.removeEventListener('click', handleCloseMenu);
    };
  }, []);

  const filteredBuckets = buckets.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;
    await onCreateBucket(newBucketName.trim());
    setNewBucketName('');
    setShowCreateForm(false);
  };

  return (
    <aside className="w-72 border-r border-border bg-surface/40 flex flex-col h-full shrink-0 select-none">
      {/* Search & Create Toolbar */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Danh sách Bucket ({buckets.length})
          </span>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="p-1 rounded bg-primary-600/20 hover:bg-primary-600 text-primary-400 hover:text-white transition-colors"
            title="Tạo Bucket mới"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={handleCreate} className="flex items-center space-x-1.5 pt-1">
            <input
              type="text"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              placeholder="tên-bucket-mới"
              className="flex-1 bg-surface border border-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-primary-600 hover:bg-primary-500 text-xs text-white font-medium"
            >
              Tạo
            </button>
          </form>
        )}

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Lọc tên Bucket..."
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Bucket List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredBuckets.length === 0 && (
          <div className="text-center py-8 text-xs text-gray-400">Không tìm thấy Bucket nào</div>
        )}

        {filteredBuckets.map((b) => {
          const isSelected = selectedBucket === b.name;
          return (
            <div
              key={b.name}
              onClick={() => onSelectBucket(b.name)}
              onContextMenu={(e) => {
                e.preventDefault();
                onSelectBucket(b.name);
                setActiveBucketMenu({
                  bucket: b,
                  x: Math.min(e.clientX, window.innerWidth - 210),
                  y: Math.min(e.clientY, window.innerHeight - 300)
                });
              }}
              className={`group flex items-center justify-between p-2.5 rounded-xl cursor-context-menu transition-all ${
                isSelected
                  ? 'bg-primary-600/20 border border-primary-500/40 text-white shadow-sm'
                  : 'hover:bg-surface text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Database className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary-400' : 'text-gray-400'}`} />
                <div className="truncate">
                  <div className="text-sm font-medium truncate">{b.name}</div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {new Date(b.creationDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBucket(b.name);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveBucketMenu({
                      bucket: b,
                      x: Math.min(rect.right, window.innerWidth - 210),
                      y: Math.min(rect.bottom + 4, window.innerHeight - 300)
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white transition-opacity"
                  title="Menu cấu hình nhanh (hoặc nhấp chuột phải)"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Bạn có chắc muốn xóa Bucket "${b.name}" không?`)) {
                      onDeleteBucket(b.name);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-opacity"
                  title="Xóa Bucket"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Bucket Quick Management Tabs */}
      {selectedBucket && (
        <div className="p-3 border-t border-border bg-surface/80 space-y-2">
          <div className="text-[11px] font-semibold text-accent-400 uppercase tracking-wider truncate">
            Cấu hình: {selectedBucket}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onOpenVersioningModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-gray-300 hover:text-white transition-colors"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-accent-400" />
              <span>Versioning</span>
            </button>
            <button
              onClick={onOpenAclModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-gray-300 hover:text-white transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>ACL</span>
            </button>
            <button
              onClick={onOpenPolicyModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-gray-300 hover:text-white transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Bucket Policy</span>
            </button>
            <button
              onClick={onOpenLifecycleModal}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-gray-300 hover:text-white transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Lifecycle</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Bucket Context Menu */}
      {activeBucketMenu && activeBucketMenu.bucket && (
        <div
          style={{ top: `${activeBucketMenu.y}px`, left: `${activeBucketMenu.x}px` }}
          className="fixed z-50 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl py-1.5 min-w-[190px] text-xs animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold text-gray-400 truncate max-w-[200px]">
            Bucket: {activeBucketMenu.bucket.name}
          </div>

          <button
            onClick={() => {
              onSelectBucket(activeBucketMenu.bucket.name);
              setActiveBucketMenu(null);
            }}
            className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
          >
            <Database className="w-4 h-4 text-primary-400" />
            <span>Mở Bucket này</span>
          </button>

          <button
            onClick={() => {
              onSelectBucket(activeBucketMenu.bucket.name);
              setActiveBucketMenu(null);
              setTimeout(() => onOpenVersioningModal?.(), 50);
            }}
            className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
          >
            <FolderGit2 className="w-4 h-4 text-accent-400" />
            <span>Quản lý Versioning</span>
          </button>

          <button
            onClick={() => {
              onSelectBucket(activeBucketMenu.bucket.name);
              setActiveBucketMenu(null);
              setTimeout(() => onOpenAclModal?.(), 50);
            }}
            className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Quản lý ACL Bucket</span>
          </button>

          <button
            onClick={() => {
              onSelectBucket(activeBucketMenu.bucket.name);
              setActiveBucketMenu(null);
              setTimeout(() => onOpenPolicyModal?.(), 50);
            }}
            className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Bucket Policy</span>
          </button>

          <button
            onClick={() => {
              onSelectBucket(activeBucketMenu.bucket.name);
              setActiveBucketMenu(null);
              setTimeout(() => onOpenLifecycleModal?.(), 50);
            }}
            className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
          >
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Lifecycle Rules</span>
          </button>

          <div className="border-t border-border my-1" />

          <button
            onClick={() => {
              const bToDelete = activeBucketMenu.bucket.name;
              setActiveBucketMenu(null);
              if (confirm(`Bạn có chắc muốn xóa Bucket "${bToDelete}" không?`)) {
                onDeleteBucket(bToDelete);
              }
            }}
            className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span>Xóa Bucket</span>
          </button>
        </div>
      )}
    </aside>
  );
}
