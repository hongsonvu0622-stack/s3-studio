import React, { useState, useEffect } from 'react';
import {
  Folder,
  Database,
  ChevronRight,
  ChevronDown,
  Loader2,
  X,
  Check,
  ArrowLeft
} from 'lucide-react';

function TreeNode({
  bucket,
  prefixKey,
  displayName,
  isRoot = false,
  selectedPrefix,
  onSelect,
  level = 0
}) {
  const [expanded, setExpanded] = useState(isRoot);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchChildren = async () => {
    if (loaded && children.length > 0) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.listObjects(bucket, prefixKey, '/', false, { maxKeys: 1000 });
      if (res && res.folders) {
        setChildren(res.folders);
        setLoaded(true);
      }
    } catch (e) {
      console.error('Lỗi tải thư mục con:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRoot) {
      fetchChildren();
    }
  }, [isRoot, bucket]);

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    if (!expanded && !loaded) {
      fetchChildren();
    }
    setExpanded(!expanded);
  };

  const isSelected = selectedPrefix === prefixKey;

  return (
    <div className="select-none">
      <div
        onClick={() => onSelect(prefixKey)}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        className={`flex items-center space-x-2 py-2 pr-3 rounded-xl cursor-pointer transition-all ${
          isSelected
            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 font-semibold shadow-sm'
            : 'hover:bg-surface-hover text-gray-200 border border-transparent'
        }`}
      >
        <button
          type="button"
          onClick={handleToggleExpand}
          className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/5"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-400" />
          ) : expanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        {isRoot ? (
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-amber-400 shrink-0 fill-amber-400/20" />
        )}

        <span className="text-xs truncate">{displayName}</span>
      </div>

      {expanded && (
        <div className="mt-0.5 space-y-0.5">
          {children.length === 0 && loaded && (
            <div
              style={{ paddingLeft: `${(level + 1) * 20 + 36}px` }}
              className="text-[11px] text-gray-500 italic py-1.5"
            >
              Không có thư mục con
            </div>
          )}
          {children.map((child) => (
            <TreeNode
              key={child.key}
              bucket={bucket}
              prefixKey={child.key}
              displayName={child.name}
              selectedPrefix={selectedPrefix}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderBrowserModal({
  isOpen,
  onClose,
  bucket,
  initialPrefix = '',
  onSelectFolder
}) {
  if (!isOpen) return null;

  const [selectedPrefix, setSelectedPrefix] = useState(initialPrefix);

  useEffect(() => {
    setSelectedPrefix(initialPrefix);
  }, [initialPrefix, isOpen]);

  const handleConfirm = () => {
    onSelectFolder(selectedPrefix);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface/80">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-surface-hover text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold text-white flex items-center space-x-2">
              <span>Duyệt & Chọn Thư mục (Browse to Folder)</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tree Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <TreeNode
            bucket={bucket}
            prefixKey=""
            displayName={bucket}
            isRoot={true}
            selectedPrefix={selectedPrefix}
            onSelect={setSelectedPrefix}
            level={0}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-surface/80 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-gray-400">Thư mục chọn: </span>
            <span className="font-mono font-semibold text-amber-300">
              {selectedPrefix || '(Toàn bộ Bucket)'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white hover:bg-surface-hover border border-border transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-500/20 transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Chọn thư mục này</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
