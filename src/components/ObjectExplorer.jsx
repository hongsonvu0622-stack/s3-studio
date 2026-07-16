import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  FolderPlus,
  Trash2,
  Share2,
  Search,
  Folder,
  FileText,
  RotateCcw,
  CheckSquare,
  Square,
  Eye,
  Shield,
  Layers,
  Copy,
  FolderInput,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Info
} from 'lucide-react';
import CopyMoveModal from './CopyMoveModal';

export default function ObjectExplorer({
  bucket,
  prefix,
  folders,
  files,
  showVersions,
  onToggleShowVersions,
  onNavigatePrefix,
  onUploadFiles,
  onCreateFolder,
  onDownloadFile,
  onDownloadFolder,
  onDeleteObjects,
  onRestoreVersion,
  onOpenPresignedModal,
  onOpenObjectAclModal,
  onOpenPropertiesModal,
  onDropFiles,
  pagination = {},
  onNextPage,
  onPrevPage,
  onChangeMaxKeys,
  onSearchApi,
  isSearchingApi
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [newFolderInput, setNewFolderInput] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [copyMoveModal, setCopyMoveModal] = useState({
    isOpen: false,
    mode: 'COPY',
    file: null
  });

  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setActiveMenu(null);
    });
    return () => {
      window.removeEventListener('click', handleCloseMenu);
    };
  }, []);

  const breadcrumbs = prefix
    ? prefix.split('/').filter(Boolean)
    : [];

  const handleBreadcrumbClick = (idx) => {
    if (idx === -1) {
      onNavigatePrefix('');
    } else {
      const targetPrefix = breadcrumbs.slice(0, idx + 1).join('/') + '/';
      onNavigatePrefix(targetPrefix);
    }
  };

  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleSelectAll = () => {
    if (selectedKeys.length === filteredFiles.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(filteredFiles.map(f => ({ Key: f.key, VersionId: f.versionId })));
    }
  };

  const toggleSelectKey = (file) => {
    const exists = selectedKeys.some(s => s.Key === file.key && s.VersionId === file.versionId);
    if (exists) {
      setSelectedKeys(selectedKeys.filter(s => !(s.Key === file.key && s.VersionId === file.versionId)));
    } else {
      setSelectedKeys([...selectedKeys, { Key: file.key, VersionId: file.versionId }]);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleCreateFolderSubmit = (e) => {
    e.preventDefault();
    if (!newFolderInput.trim()) return;
    onCreateFolder(newFolderInput.trim());
    setNewFolderInput('');
    setShowFolderModal(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const filePaths = Array.from(e.dataTransfer.files)
      .map((file) => {
        if (window.electronAPI && window.electronAPI.getPathForFile) {
          return window.electronAPI.getPathForFile(file);
        }
        return file.path;
      })
      .filter(Boolean);

    if (filePaths.length > 0 && onDropFiles) {
      onDropFiles(filePaths);
    }
  };

  if (!bucket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 select-none">
        <Layers className="w-16 h-16 mb-4 text-gray-400 stroke-1" />
        <h3 className="text-base font-semibold text-gray-300">Chọn một Bucket từ Sidebar bên trái</h3>
        <p className="text-xs text-gray-400 mt-1">Hoặc tạo mới để bắt đầu duyệt tập tin trên S3</p>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-full overflow-hidden bg-background relative"
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-primary-950/85 backdrop-blur-md border-2 border-dashed border-primary-400 flex flex-col items-center justify-center pointer-events-none transition-all">
          <Upload className="w-16 h-16 text-primary-400 animate-bounce mb-3" />
          <h3 className="text-lg font-bold text-white">Thả tập tin vào đây để tải lên ngay</h3>
          <p className="text-xs text-primary-300 mt-1">Tự động đẩy vào Hàng đợi truyền tải đa luồng của {bucket}</p>
        </div>
      )}
      {/* Top Breadcrumb & Toolbar */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          {/* Breadcrumbs */}
          <div className="flex items-center space-x-1.5 text-sm font-medium overflow-x-auto">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="text-primary-400 hover:text-white transition-colors"
            >
              {bucket}
            </button>
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className="text-gray-400">/</span>
                <button
                  onClick={() => handleBreadcrumbClick(idx)}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {crumb}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Show Versions Toggle */}
          <label className="flex items-center space-x-2.5 bg-surface px-3 py-1.5 rounded-xl border border-border cursor-pointer hover:bg-surface-hover transition-colors">
            <input
              type="checkbox"
              checked={showVersions}
              onChange={(e) => onToggleShowVersions(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-gray-200">Hiển thị lịch sử phiên bản (Show Versions)</span>
          </label>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={onUploadFiles}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-semibold text-white shadow-lg shadow-primary-500/20 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Tải lên Tập tin (Multi-thread)</span>
            </button>

            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-gray-200 transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-accent-400" />
              <span>Tạo Thư mục</span>
            </button>

            {selectedKeys.length > 0 && (
              <button
                onClick={() => {
                  if (confirm(`Xóa ${selectedKeys.length} mục đã chọn?`)) {
                    onDeleteObjects(selectedKeys);
                    setSelectedKeys([]);
                  }
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 border border-red-500/40 text-xs font-medium text-red-300 hover:text-white transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa mục đã chọn ({selectedKeys.length})</span>
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSearchApi?.(searchTerm);
            }}
            className="flex items-center space-x-1.5"
          >
            <div className="relative w-60">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value === '') {
                    onSearchApi?.('');
                  }
                }}
                placeholder="Tìm qua API Server (Enter)..."
                className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingApi}
              className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-medium text-white flex items-center space-x-1.5 shadow transition-all"
              title="Tìm kiếm trên máy chủ S3 qua API (giải quyết triệu file)"
            >
              {isSearchingApi ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Tìm API</span>
            </button>
          </form>
        </div>
      </div>

      {/* Folder Creation Modal Form */}
      {showFolderModal && (
        <div className="p-3 bg-surface border-b border-border flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-300">Tên thư mục mới:</span>
          <form onSubmit={handleCreateFolderSubmit} className="flex items-center space-x-2">
            <input
              type="text"
              value={newFolderInput}
              onChange={(e) => setNewFolderInput(e.target.value)}
              placeholder="vd: backup-2026/"
              className="bg-background border border-border rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1 rounded bg-primary-600 hover:bg-primary-500 text-xs text-white font-medium"
            >
              Tạo
            </button>
            <button
              type="button"
              onClick={() => setShowFolderModal(false)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white"
            >
              Hủy
            </button>
          </form>
        </div>
      )}

      {/* Main Table Content */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-surface/90 sticky top-0 z-10 border-b border-border text-gray-400 font-semibold uppercase tracking-wider select-none">
            <tr>
              <th className="p-3 w-10 text-center">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                  {selectedKeys.length === filteredFiles.length && filteredFiles.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="p-3">Tên Tập tin / Thư mục</th>
              {showVersions && <th className="p-3">Version ID & Trạng thái</th>}
              <th className="p-3">Kích thước</th>
              <th className="p-3">Lớp lưu trữ</th>
              <th className="p-3">Ngày cập nhật</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {/* Folders List */}
            {filteredFolders.map((f) => (
              <tr
                key={f.key}
                onClick={() => onNavigatePrefix(f.key)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setActiveMenu({
                    item: f,
                    isFolder: true,
                    x: Math.min(e.clientX, window.innerWidth - 230),
                    y: Math.min(e.clientY, window.innerHeight - 300)
                  });
                }}
                className="hover:bg-surface/60 cursor-pointer transition-colors"
              >
                <td className="p-3 text-center">
                  <Folder className="w-4 h-4 text-accent-400 mx-auto" />
                </td>
                <td className="p-3 font-semibold text-accent-400 hover:underline">{f.name}</td>
                {showVersions && <td className="p-3 text-gray-400">-</td>}
                <td className="p-3 text-gray-400">-</td>
                <td className="p-3 text-gray-400">-</td>
                <td className="p-3 text-gray-400">-</td>
                <td className="p-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadFolder?.(f);
                    }}
                    className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                    title="Tải xuống toàn bộ thư mục"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Files List */}
            {filteredFiles.map((file, idx) => {
              const isSelected = selectedKeys.some(
                s => s.Key === file.key && s.VersionId === file.versionId
              );
              return (
                <tr
                  key={`${file.key}-${file.versionId || idx}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActiveMenu({
                      file,
                      x: Math.min(e.clientX, window.innerWidth - 230),
                      y: Math.min(e.clientY, window.innerHeight - 300)
                    });
                  }}
                  className={`hover:bg-surface/80 transition-colors cursor-context-menu ${file.deleteMarker ? 'opacity-60 bg-red-950/10' : ''}`}
                >
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectKey(file);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  <td className="p-3 font-medium text-white">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-primary-400 shrink-0" />
                      <span className="truncate max-w-sm">{file.name}</span>
                      {file.deleteMarker && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-semibold">
                          Delete Marker
                        </span>
                      )}
                    </div>
                  </td>

                  {showVersions && (
                    <td className="p-3 font-mono text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-gray-300">{file.versionId || 'null'}</span>
                        {file.isLatest && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
                            Latest
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  <td className="p-3 text-gray-300">{formatSize(file.size)}</td>
                  <td className="p-3 text-gray-400">{file.storageClass || 'STANDARD'}</td>
                  <td className="p-3 text-gray-400">
                    {file.lastModified ? new Date(file.lastModified).toLocaleString() : '-'}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {!file.deleteMarker && (
                        <>
                          <button
                            onClick={() => onDownloadFile(file)}
                            className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                            title="Tải xuống nhanh"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onOpenObjectAclModal?.(file)}
                            className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-emerald-400 transition-colors"
                            title="Phân quyền ACL cho tập tin"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveMenu({
                            file,
                            x: Math.min(rect.right - 190, window.innerWidth - 230),
                            y: Math.min(rect.bottom + 4, window.innerHeight - 300)
                          });
                        }}
                        className="p-1.5 rounded hover:bg-surface text-gray-400 hover:text-white transition-colors"
                        title="Menu thao tác (hoặc nhấp chuột phải)"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="h-11 px-4 border-t border-border bg-background/80 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-3">
          <span>
            Trang {(pagination.history?.length || 0) + 1}
          </span>
          <span>•</span>
          <div className="flex items-center space-x-1.5">
            <span>Hiển thị tối đa:</span>
            <select
              value={pagination.maxKeys || 1000}
              onChange={(e) => onChangeMaxKeys?.(Number(e.target.value))}
              className="bg-surface border border-border rounded px-2 py-1 text-gray-200 text-xs focus:outline-none focus:border-primary-500"
            >
              <option value={100}>100 dòng</option>
              <option value={500}>500 dòng</option>
              <option value={1000}>1000 dòng</option>
              <option value={2500}>2500 dòng</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onPrevPage}
            disabled={!pagination.history || pagination.history.length === 0}
            className={`px-3 py-1.5 rounded border border-border flex items-center space-x-1 transition-all ${
              !pagination.history || pagination.history.length === 0
                ? 'opacity-40 cursor-not-allowed text-gray-500'
                : 'hover:bg-surface text-gray-300 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Trang trước</span>
          </button>
          <button
            onClick={onNextPage}
            disabled={!pagination.isTruncated}
            className={`px-3 py-1.5 rounded border border-border flex items-center space-x-1 transition-all ${
              !pagination.isTruncated
                ? 'opacity-40 cursor-not-allowed text-gray-500'
                : 'hover:bg-surface text-gray-300 hover:text-white border-primary-500/40 bg-primary-500/10'
            }`}
          >
            <span>Trang tiếp</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Floating Context & Dropdown Menu */}
      {activeMenu && (activeMenu.file || activeMenu.isFolder) && (
        <div
          style={{ top: `${activeMenu.y}px`, left: `${activeMenu.x}px` }}
          className="fixed z-50 bg-surface/95 backdrop-blur-md border border-border rounded-xl shadow-2xl py-1.5 min-w-[210px] text-xs animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {activeMenu.isFolder && activeMenu.item ? (
            <>
              <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold text-accent-400 truncate max-w-[220px]">
                📁 {activeMenu.item.name}
              </div>

              <button
                onClick={() => {
                  onDownloadFolder?.(activeMenu.item);
                  setActiveMenu(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4 text-primary-400" />
                <span>Tải xuống nguyên thư mục</span>
              </button>

              <button
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(activeMenu.item.name);
                  }
                  setActiveMenu(null);
                }}
                className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4 text-blue-400" />
                <span>Sao chép tên thư mục</span>
              </button>
            </>
          ) : activeMenu.file ? (
            <>
              <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold text-gray-400 truncate max-w-[220px]">
                {activeMenu.file.name}
              </div>

              {!activeMenu.file.deleteMarker && (
                <>
                  <button
                    onClick={() => {
                      onOpenPropertiesModal?.(activeMenu.file.key);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                  >
                    <Info className="w-4 h-4 text-primary-400" />
                    <span>Thuộc tính & Metadata</span>
                  </button>

                  <button
                    onClick={() => {
                      onDownloadFile(activeMenu.file);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                  >
                    <Download className="w-4 h-4 text-primary-400" />
                    <span>Tải xuống tập tin</span>
                  </button>

                  <button
                    onClick={() => {
                      setCopyMoveModal({ isOpen: true, mode: 'COPY', file: activeMenu.file });
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4 text-blue-400" />
                    <span>Sao chép tập tin</span>
                  </button>

                  <button
                    onClick={() => {
                      setCopyMoveModal({ isOpen: true, mode: 'MOVE', file: activeMenu.file });
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                  >
                    <FolderInput className="w-4 h-4 text-accent-400" />
                    <span>Di chuyển tập tin</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenObjectAclModal?.(activeMenu.file);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Phân quyền ACL</span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenPresignedModal(activeMenu.file);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-purple-400" />
                    <span>Tạo URL chia sẻ (Presigned)</span>
                  </button>
                </>
              )}

              {showVersions && !activeMenu.file.isLatest && !activeMenu.file.deleteMarker && (
                <button
                  onClick={() => {
                    onRestoreVersion(activeMenu.file);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-surface-hover text-gray-200 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Khôi phục phiên bản</span>
                </button>
              )}

              <div className="border-t border-border my-1" />

              <button
                onClick={() => {
                  const fileToDelete = activeMenu.file;
                  setActiveMenu(null);
                  if (window.confirm(`Xóa ${fileToDelete.name}?`)) {
                    onDeleteObjects([{ Key: fileToDelete.key, VersionId: fileToDelete.versionId }]);
                  }
                }}
                className="w-full px-3 py-2 text-left flex items-center space-x-2.5 hover:bg-red-500/15 text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Xóa tập tin</span>
              </button>
            </>
          ) : null}
        </div>
      )}

      {copyMoveModal.isOpen && copyMoveModal.file && (
        <CopyMoveModal
          isOpen={copyMoveModal.isOpen}
          onClose={() => setCopyMoveModal({ isOpen: false, mode: 'COPY', file: null })}
          mode={copyMoveModal.mode}
          sourceBucket={bucket}
          sourceKey={copyMoveModal.file.key}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent('refresh-objects'));
          }}
        />
      )}
    </div>
  );
}
