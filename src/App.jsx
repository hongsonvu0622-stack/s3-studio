import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Settings, RefreshCw, Zap } from 'lucide-react';
import Header from './components/Header.jsx';
import ProfileModal from './components/ProfileModal.jsx';
import BucketList from './components/BucketList.jsx';
import ObjectExplorer from './components/ObjectExplorer.jsx';
import VersioningModal from './components/VersioningModal.jsx';
import AclModal from './components/AclModal.jsx';
import PolicyEditorModal from './components/PolicyEditorModal.jsx';
import LifecycleModal from './components/LifecycleModal.jsx';
import PresignedUrlModal from './components/PresignedUrlModal.jsx';
import ObjectPropertiesModal from './components/ObjectPropertiesModal.jsx';
import TransferQueue from './components/TransferQueue.jsx';
import ToastContainer, { showToast } from './components/Toast.jsx';

export default function App() {
  // Theme state ('dark' or 'light')
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('s3_studio_theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('s3_studio_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    showToast(
      theme === 'dark'
        ? 'Đã chuyển sang Giao diện Sáng (Light Mode)'
        : 'Đã chuyển sang Giao diện Tối (Dark Mode)',
      'success'
    );
  };

  // Profiles & Connection
  const [profiles, setProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Buckets & Explorer
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [prefix, setPrefix] = useState('');
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [showVersions, setShowVersions] = useState(false);

  // Advanced bucket management state
  const [versioningStatus, setVersioningStatus] = useState('Suspended');
  const [versioningModalOpen, setVersioningModalOpen] = useState(false);
  const [aclModalOpen, setAclModalOpen] = useState(false);
  const [policyText, setPolicyText] = useState('');
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [lifecycleRules, setLifecycleRules] = useState([]);
  const [lifecycleModalOpen, setLifecycleModalOpen] = useState(false);

  // Presigned URL generator state
  const [presignedModalOpen, setPresignedModalOpen] = useState(false);
  const [propertiesModalOpen, setPropertiesModalOpen] = useState(false);
  const [targetObjectKey, setTargetObjectKey] = useState(null);

  // Transfer Queue state
  const [transferQueue, setTransferQueue] = useState([]);
  const [concurrencyLevel, setConcurrencyLevel] = useState(5);

  // 1. Load profiles on init
  useEffect(() => {
    async function init() {
      if (!window.electronAPI) return;
      const loadedProfiles = await window.electronAPI.getProfiles();
      setProfiles(loadedProfiles);

      if (loadedProfiles.length > 0) {
        handleSelectProfile(loadedProfiles[0].id, loadedProfiles);
      }
    }
    init();

    if (window.electronAPI?.onQueueUpdate) {
      const unsubscribe = window.electronAPI.onQueueUpdate((updatedQueue) => {
        setTransferQueue(updatedQueue);
      });
      return () => unsubscribe();
    }
  }, []);

  // 2. Connect & load buckets
  const handleSelectProfile = async (profileId, list = profiles) => {
    const p = list.find((item) => item.id === profileId);
    if (!p) return;
    setCurrentProfile(p);
    setIsConnected(false);
    setConnectionError(null);
    setSelectedBucket(null);
    setPrefix('');

    try {
      await window.electronAPI.connectProfile(profileId);
      await loadBuckets();
    } catch (err) {
      console.error('Failed to connect to profile:', err);
      setIsConnected(false);
      setConnectionError(err.message);
    }
  };

  const loadBuckets = useCallback(async () => {
    setConnectionError(null);
    try {
      const list = await window.electronAPI.listBuckets();
      setBuckets(list);
      setIsConnected(true);
    } catch (err) {
      console.error('Error loading buckets:', err);
      setIsConnected(false);
      setConnectionError(err.message || 'Lỗi kết nối tới máy chủ S3');
      setBuckets([]);
    }
  }, []);

  const [pagination, setPagination] = useState({
    maxKeys: 1000,
    isTruncated: false,
    nextContinuationToken: null,
    nextKeyMarker: null,
    nextVersionIdMarker: null,
    history: []
  });

  // 3. Load Objects when Bucket / Prefix / showVersions changes
  const loadObjects = useCallback(async (bucketName, pathPrefix, versionsFlag, pagingOptions = {}) => {
    if (!bucketName) return;
    try {
      const res = await window.electronAPI.listObjects(
        bucketName,
        pathPrefix,
        '/',
        versionsFlag,
        pagingOptions
      );
      setFolders(res.folders || []);
      setFiles(res.files || []);
      setPagination(prev => ({
        ...prev,
        maxKeys: pagingOptions.maxKeys || prev.maxKeys,
        isTruncated: res.isTruncated || false,
        nextContinuationToken: res.nextContinuationToken || null,
        nextKeyMarker: res.nextKeyMarker || null,
        nextVersionIdMarker: res.nextVersionIdMarker || null
      }));
    } catch (err) {
      console.error('Error listing objects:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      setPagination(prev => ({ ...prev, history: [] }));
      loadObjects(selectedBucket, prefix, showVersions, { maxKeys: pagination.maxKeys });
    }
  }, [selectedBucket, prefix, showVersions, loadObjects]);

  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const handleSearchApi = async (query) => {
    if (!selectedBucket) return;
    if (!query || !query.trim()) {
      loadObjects(selectedBucket, prefix, showVersions, { maxKeys: pagination.maxKeys });
      return;
    }
    setIsSearchingApi(true);
    try {
      const res = await window.electronAPI.searchObjects(selectedBucket, query.trim(), prefix, 500);
      setFolders(res.folders || []);
      setFiles(res.files || []);
      setPagination(prev => ({
        ...prev,
        isTruncated: false,
        history: []
      }));
    } catch (err) {
      console.error('Error searching objects via API:', err);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const handleNextPage = () => {
    if (!pagination.isTruncated) return;
    const currentToken = {
      continuationToken: pagination.nextContinuationToken,
      keyMarker: pagination.nextKeyMarker,
      versionIdMarker: pagination.nextVersionIdMarker
    };
    setPagination(prev => ({
      ...prev,
      history: [...prev.history, currentToken]
    }));

    loadObjects(selectedBucket, prefix, showVersions, {
      maxKeys: pagination.maxKeys,
      continuationToken: pagination.nextContinuationToken,
      keyMarker: pagination.nextKeyMarker,
      versionIdMarker: pagination.nextVersionIdMarker
    });
  };

  const handlePrevPage = () => {
    if (pagination.history.length === 0) return;
    const newHistory = [...pagination.history];
    newHistory.pop();
    const prevToken = newHistory[newHistory.length - 1] || {};

    setPagination(prev => ({
      ...prev,
      history: newHistory
    }));

    loadObjects(selectedBucket, prefix, showVersions, {
      maxKeys: pagination.maxKeys,
      continuationToken: prevToken.continuationToken,
      keyMarker: prevToken.keyMarker,
      versionIdMarker: prevToken.versionIdMarker
    });
  };

  const handleChangeMaxKeys = (newMaxKeys) => {
    setPagination(prev => ({ ...prev, maxKeys: newMaxKeys, history: [] }));
    loadObjects(selectedBucket, prefix, showVersions, { maxKeys: newMaxKeys });
  };

  // Tự động refetch màn hình khi có tác vụ Upload/Download/Copy/Move hoàn tất
  useEffect(() => {
    const handleRefresh = () => {
      if (selectedBucket) {
        loadObjects(selectedBucket, prefix, showVersions, { maxKeys: pagination.maxKeys });
      }
    };
    window.addEventListener('refresh-objects', handleRefresh);

    if (!window.electronAPI?.onTransferCompleted) {
      return () => window.removeEventListener('refresh-objects', handleRefresh);
    }
    const unsubscribe = window.electronAPI.onTransferCompleted((data) => {
      if (selectedBucket && data && data.bucket === selectedBucket) {
        loadObjects(selectedBucket, prefix, showVersions, { maxKeys: pagination.maxKeys });
      }
    });
    return () => {
      unsubscribe();
      window.removeEventListener('refresh-objects', handleRefresh);
    };
  }, [selectedBucket, prefix, showVersions, loadObjects]);

  // Handle Bucket Selection
  const handleSelectBucket = async (name) => {
    setSelectedBucket(name);
    setPrefix('');
    try {
      const status = await window.electronAPI.getBucketVersioning(name);
      setVersioningStatus(status);
    } catch (err) {
      setVersioningStatus('Suspended');
    }
  };

  const handleCreateBucket = async (bucketName) => {
    try {
      await window.electronAPI.createBucket(bucketName, currentProfile?.region || 'us-east-1');
      await loadBuckets();
      showToast(`Tạo Bucket "${bucketName}" thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi tạo Bucket!', 'error');
    }
  };

  const handleDeleteBucket = async (bucketName) => {
    try {
      await window.electronAPI.deleteBucket(bucketName);
      if (selectedBucket === bucketName) {
        setSelectedBucket(null);
        setFolders([]);
        setFiles([]);
      }
      await loadBuckets();
      showToast(`Xóa Bucket "${bucketName}" thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi xóa Bucket!', 'error');
    }
  };

  // 4. Object & Versioning operations
  const handleUploadFiles = async () => {
    if (!selectedBucket) return;
    const filePaths = await window.electronAPI.selectUploadFiles();
    if (!filePaths || filePaths.length === 0) return;

    for (const filePath of filePaths) {
      await window.electronAPI.addUploadTask(selectedBucket, prefix, filePath);
    }
    showToast(`Đã thêm ${filePaths.length} tệp vào hàng đợi tải lên!`, 'success');
  };

  const handleCreateFolder = async (folderName) => {
    if (!selectedBucket) return;
    try {
      const folderKey = prefix ? `${prefix}${folderName}` : folderName;
      const ensureSlashKey = folderKey.endsWith('/') ? folderKey : `${folderKey}/`;
      await window.electronAPI.putObjectAcl(selectedBucket, ensureSlashKey, 'private').catch(() => {});
      await loadObjects(selectedBucket, prefix, showVersions);
      showToast(`Tạo thư mục "${folderName}" thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi tạo thư mục!', 'error');
    }
  };

  const handleDropFiles = async (filePaths) => {
    if (!selectedBucket || !filePaths || filePaths.length === 0) return;
    for (const filePath of filePaths) {
      await window.electronAPI.addUploadTask(selectedBucket, prefix, filePath);
    }
    showToast(`Đã thêm ${filePaths.length} tệp vào hàng đợi tải lên!`, 'success');
  };

  const handleDownloadFile = async (file) => {
    if (!selectedBucket) return;
    const saveDir = await window.electronAPI.selectSaveDirectory();
    if (!saveDir) return;

    const fullSavePath = `${saveDir}/${file.name.split('/').pop()}`;
    await window.electronAPI.addDownloadTask(selectedBucket, file.key, fullSavePath);
    showToast(`Đã thêm "${file.name}" vào hàng đợi tải xuống!`, 'success');
  };

  const handleDeleteObjects = async (objectList) => {
    if (!selectedBucket || objectList.length === 0) return;
    try {
      await window.electronAPI.deleteObjects(selectedBucket, objectList);
      await loadObjects(selectedBucket, prefix, showVersions);
      showToast(`Xóa ${objectList.length} đối tượng thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi xóa đối tượng!', 'error');
    }
  };

  const handleRestoreVersion = async (file) => {
    if (!selectedBucket || !file.versionId) return;
    try {
      await window.electronAPI.restoreObjectVersion(selectedBucket, file.key, file.versionId);
      await loadObjects(selectedBucket, prefix, showVersions);
      showToast(`Khôi phục phiên bản cho "${file.name}" thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi khôi phục phiên bản!', 'error');
    }
  };

  // 5. Modals & Advanced configurations
  const handleOpenPolicyModal = async () => {
    if (!selectedBucket) return;
    try {
      const policy = await window.electronAPI.getBucketPolicy(selectedBucket);
      setPolicyText(policy);
      setPolicyModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Lỗi đọc Bucket Policy!', 'error');
    }
  };

  const handleSavePolicy = async (bucketName, jsonText) => {
    try {
      await window.electronAPI.putBucketPolicy(bucketName, jsonText);
      showToast('Lưu Bucket Policy thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi lưu Bucket Policy!', 'error');
      throw err;
    }
  };

  const handleDeletePolicy = async (bucketName) => {
    try {
      await window.electronAPI.deleteBucketPolicy(bucketName);
      showToast('Xóa Bucket Policy thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi xóa Bucket Policy!', 'error');
      throw err;
    }
  };

  const handleOpenLifecycleModal = async () => {
    if (!selectedBucket) return;
    try {
      const rules = await window.electronAPI.getBucketLifecycle(selectedBucket);
      setLifecycleRules(rules);
      setLifecycleModalOpen(true);
    } catch (err) {
      showToast(err.message || 'Lỗi đọc Lifecycle Rules!', 'error');
    }
  };

  const handleSaveLifecycle = async (bucketName, rules) => {
    try {
      await window.electronAPI.putBucketLifecycle(bucketName, rules);
      showToast('Lưu Lifecycle Rules thành công!', 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi lưu Lifecycle Rules!', 'error');
      throw err;
    }
  };

  const handleSaveAcl = async (bucketName, acl) => {
    try {
      await window.electronAPI.putBucketAcl(bucketName, acl);
      showToast(`Cập nhật ACL cho Bucket "${bucketName}" thành công!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi lưu Bucket ACL!', 'error');
      throw err;
    }
  };

  const handleSaveVersioning = async (newStatus) => {
    if (!selectedBucket) return;
    try {
      await window.electronAPI.putBucketVersioning(selectedBucket, newStatus);
      setVersioningStatus(newStatus);
      showToast(`Đã chuyển trạng thái Versioning thành "${newStatus}"!`, 'success');
    } catch (err) {
      showToast(err.message || 'Lỗi cấu hình Versioning!', 'error');
      throw err;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Header Bar */}
      <Header
        profiles={profiles}
        currentProfile={currentProfile}
        onSelectProfile={handleSelectProfile}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onRefresh={() => {
          loadBuckets();
          if (selectedBucket) loadObjects(selectedBucket, prefix, showVersions);
        }}
        isConnected={isConnected}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-3 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              <span className="font-semibold">Chưa kết nối được tới máy chủ S3:</span>{' '}
              <span className="font-mono bg-black/30 px-1.5 py-0.5 rounded text-amber-300">{connectionError}</span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Mẹo: Nhấp vào nút "Quản lý Tài khoản" bên dưới hoặc "⚡ Nhập từ Rclone" để chọn đúng máy chủ của bạn.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors shadow-sm"
            >
              Cấu hình Tài khoản ngay
            </button>
            <button
              onClick={loadBuckets}
              className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-gray-300 hover:text-white"
              title="Thử kết nối lại"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Buckets Sidebar */}
        <BucketList
          buckets={buckets}
          selectedBucket={selectedBucket}
          onSelectBucket={handleSelectBucket}
          onCreateBucket={handleCreateBucket}
          onDeleteBucket={handleDeleteBucket}
          onOpenVersioningModal={() => setVersioningModalOpen(true)}
          onOpenAclModal={() => {
            setTargetObjectKey(null);
            setAclModalOpen(true);
          }}
          onOpenPolicyModal={handleOpenPolicyModal}
          onOpenLifecycleModal={handleOpenLifecycleModal}
        />

        {/* Right Object Explorer View */}
        <ObjectExplorer
          bucket={selectedBucket}
          prefix={prefix}
          folders={folders}
          files={files}
          showVersions={showVersions}
          onToggleShowVersions={(checked) => setShowVersions(checked)}
          onNavigatePrefix={(newPrefix) => setPrefix(newPrefix)}
          onUploadFiles={handleUploadFiles}
          onCreateFolder={handleCreateFolder}
          onDownloadFile={handleDownloadFile}
          onDeleteObjects={handleDeleteObjects}
          onRestoreVersion={handleRestoreVersion}
          onOpenPresignedModal={(file) => {
            setTargetObjectKey(file.key);
            setPresignedModalOpen(true);
          }}
          onOpenObjectAclModal={(file) => {
            setTargetObjectKey(file ? file.key : null);
            setAclModalOpen(true);
          }}
          onDropFiles={handleDropFiles}
          pagination={pagination}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
          onChangeMaxKeys={handleChangeMaxKeys}
          onSearchApi={handleSearchApi}
          isSearchingApi={isSearchingApi}
          onOpenPropertiesModal={(key) => {
            setTargetObjectKey(key);
            setPropertiesModalOpen(true);
          }}
        />
      </div>

      {/* Bottom Transfer Queue Dock */}
      <TransferQueue
        queue={transferQueue}
        concurrencyLevel={concurrencyLevel}
        onSetConcurrency={(level) => {
          setConcurrencyLevel(level);
          window.electronAPI.setConcurrencyLevel(level);
        }}
        onCancelTask={(taskId) => window.electronAPI.cancelTask(taskId)}
        onClearCompleted={() => window.electronAPI.clearCompletedTasks()}
      />

      {/* Profile & Accounts Manager Modal */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profiles={profiles}
        onSaveProfiles={async (updated) => {
          await window.electronAPI.saveProfiles(updated);
          setProfiles(updated);
        }}
        onSelectProfile={handleSelectProfile}
      />

      {/* Bucket Versioning Modal */}
      <VersioningModal
        isOpen={versioningModalOpen}
        onClose={() => setVersioningModalOpen(false)}
        bucket={selectedBucket}
        status={versioningStatus}
        onUpdateStatus={handleSaveVersioning}
      />

      {/* ACL Modal */}
      <AclModal
        isOpen={aclModalOpen}
        onClose={() => {
          setAclModalOpen(false);
          setTargetObjectKey(null);
        }}
        bucket={selectedBucket}
        objectKey={targetObjectKey}
        onSaveAcl={handleSaveAcl}
      />

      {/* Bucket Policy Modal */}
      <PolicyEditorModal
        isOpen={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
        bucket={selectedBucket}
        policyText={policyText}
        onSavePolicy={handleSavePolicy}
        onDeletePolicy={handleDeletePolicy}
      />

      {/* Lifecycle Modal */}
      <LifecycleModal
        isOpen={lifecycleModalOpen}
        onClose={() => setLifecycleModalOpen(false)}
        bucket={selectedBucket}
        rules={lifecycleRules}
        onSaveRules={handleSaveLifecycle}
      />

      {/* Presigned URL Modal */}
      <PresignedUrlModal
        isOpen={presignedModalOpen}
        onClose={() => setPresignedModalOpen(false)}
        bucket={selectedBucket}
        objectKey={targetObjectKey}
      />

      {/* Object Properties / Metadata Modal */}
      <ObjectPropertiesModal
        isOpen={propertiesModalOpen}
        onClose={() => setPropertiesModalOpen(false)}
        bucket={selectedBucket}
        objectKey={targetObjectKey}
      />

      {/* Global Toast Notification Container */}
      <ToastContainer />
    </div>
  );
}
