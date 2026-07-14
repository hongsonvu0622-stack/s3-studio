import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  X,
  Edit2,
  AlertCircle,
  Tag,
  Clock,
  Settings,
  Archive,
  Folder
} from 'lucide-react';
import FolderBrowserModal from './FolderBrowserModal.jsx';

export default function LifecycleModal({ isOpen, onClose, bucket, rules, onSaveRules }) {
  if (!isOpen) return null;

  const [ruleList, setRuleList] = useState(() => {
    return (rules || []).map((r, index) => parseS3RuleToState(r, index));
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [currentRule, setCurrentRule] = useState(null);
  const [activeTab, setActiveTab] = useState('filter'); // 'filter' | 'expiration' | 'other'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [folderPrefixes, setFolderPrefixes] = useState([]);
  const [folderBrowserOpen, setFolderBrowserOpen] = useState(false);

  useEffect(() => {
    if (isOpen && bucket && window.electronAPI && window.electronAPI.listObjects) {
      window.electronAPI
        .listObjects(bucket, '', '/', false, { maxKeys: 1000 })
        .then((res) => {
          if (res && res.folders) {
            setFolderPrefixes(res.folders.map((f) => f.key));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, bucket]);

  function parseS3RuleToState(r, index) {
    let prefix = '';
    let tags = [];
    if (r.Filter) {
      if (r.Filter.Prefix !== undefined) prefix = r.Filter.Prefix;
      if (r.Filter.Tag) tags = [r.Filter.Tag];
      if (r.Filter.And) {
        if (r.Filter.And.Prefix !== undefined) prefix = r.Filter.And.Prefix;
        if (r.Filter.And.Tags) tags = [...r.Filter.And.Tags];
      }
    } else if (r.Prefix !== undefined) {
      prefix = r.Prefix;
    }

    const enableExpiration = !!(r.Expiration && r.Expiration.Days !== undefined);
    const expirationDays = r.Expiration?.Days || 30;
    const enableExpiredDeleteMarker = !!(r.Expiration && r.Expiration.ExpiredObjectDeleteMarker);

    const enableNoncurrentExpiration = !!(
      r.NoncurrentVersionExpiration && r.NoncurrentVersionExpiration.NoncurrentDays !== undefined
    );
    const noncurrentExpirationDays = r.NoncurrentVersionExpiration?.NoncurrentDays || 30;

    const enableAbortMultipart = !!(
      r.AbortIncompleteMultipartUpload &&
      r.AbortIncompleteMultipartUpload.DaysAfterInitiation !== undefined
    );
    const abortMultipartDays = r.AbortIncompleteMultipartUpload?.DaysAfterInitiation || 7;

    return {
      ID: r.ID || `Rule-${index + 1}`,
      Status: r.Status || 'Enabled',
      Prefix: prefix,
      Tags: tags,
      enableExpiration,
      expirationDays,
      enableExpiredDeleteMarker,
      enableNoncurrentExpiration,
      noncurrentExpirationDays,
      enableAbortMultipart,
      abortMultipartDays
    };
  }

  function convertStateToS3Rule(state) {
    const filter = {};
    if (state.Tags.length === 0) {
      filter.Prefix = state.Prefix || '';
    } else if (state.Tags.length === 1 && !state.Prefix) {
      filter.Tag = { Key: state.Tags[0].Key, Value: state.Tags[0].Value };
    } else {
      filter.And = {
        Prefix: state.Prefix || undefined,
        Tags: state.Tags
      };
    }

    let expiration = undefined;
    if (state.enableExpiration) {
      expiration = { Days: Number(state.expirationDays) || 1 };
    } else if (state.enableExpiredDeleteMarker) {
      expiration = { ExpiredObjectDeleteMarker: true };
    }

    const noncurrentVersionExpiration = state.enableNoncurrentExpiration
      ? { NoncurrentDays: Number(state.noncurrentExpirationDays) || 1 }
      : undefined;

    const abortIncompleteMultipartUpload = state.enableAbortMultipart
      ? { DaysAfterInitiation: Number(state.abortMultipartDays) || 1 }
      : undefined;

    return {
      ID: state.ID || `rule-${Date.now()}`,
      Status: state.Status || 'Enabled',
      Filter: filter,
      Expiration: expiration,
      NoncurrentVersionExpiration: noncurrentVersionExpiration,
      AbortIncompleteMultipartUpload: abortIncompleteMultipartUpload
    };
  }

  const handleStartAddNewRule = () => {
    setCurrentRule({
      ID: `Rule-${ruleList.length + 1}`,
      Status: 'Enabled',
      Prefix: '',
      Tags: [],
      enableExpiration: false,
      expirationDays: 30,
      enableExpiredDeleteMarker: false,
      enableNoncurrentExpiration: false,
      noncurrentExpirationDays: 30,
      enableAbortMultipart: true,
      abortMultipartDays: 7
    });
    setEditingIndex(-1);
    setActiveTab('filter');
    setError(null);
  };

  const handleStartEditRule = (idx) => {
    setCurrentRule(JSON.parse(JSON.stringify(ruleList[idx])));
    setEditingIndex(idx);
    setActiveTab('filter');
    setError(null);
  };

  const handleSaveCurrentRule = () => {
    if (!currentRule.ID?.trim()) {
      setError('Vui lòng nhập ID / Tên cho Quy tắc (Rule ID)');
      return;
    }
    const updated = [...ruleList];
    if (editingIndex === -1) {
      updated.push(currentRule);
    } else {
      updated[editingIndex] = currentRule;
    }
    setRuleList(updated);
    setEditingIndex(null);
    setCurrentRule(null);
  };

  const handleRemoveRule = (idx) => {
    setRuleList(ruleList.filter((_, i) => i !== idx));
  };

  const handleSaveAllRulesToBucket = async () => {
    setSaving(true);
    setError(null);
    try {
      const s3Rules = ruleList.map(r => convertStateToS3Rule(r));
      await onSaveRules(bucket, s3Rules);
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi cấu hình Lifecycle');
    } finally {
      setSaving(false);
    }
  };

  // Màn hình Thêm/Chỉnh sửa Quy tắc
  if (editingIndex !== null && currentRule) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
        <div className="glass-card w-full max-w-3xl rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl max-h-[85vh]">
          {/* Header */}
          <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-purple-400" />
              <h2 className="text-base font-semibold text-white">
                {editingIndex === -1 ? 'Thêm mới Quy tắc Lifecycle' : `Chỉnh sửa Quy tắc Lifecycle`}
              </h2>
            </div>
            <button
              onClick={() => {
                setEditingIndex(null);
                setCurrentRule(null);
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Rule ID & Status */}
          <div className="px-6 py-3 border-b border-border bg-surface/60 flex items-center justify-between space-x-4 shrink-0">
            <div className="flex items-center space-x-3 flex-1">
              <label className="text-xs font-semibold text-gray-300 shrink-0">ID Quy tắc:</label>
              <input
                type="text"
                value={currentRule.ID}
                onChange={(e) => setCurrentRule({ ...currentRule, ID: e.target.value })}
                placeholder="vd: cleanup-logs-rule"
                className="w-64 bg-background border border-border rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500 font-mono"
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={currentRule.Status === 'Enabled'}
                onChange={(e) =>
                  setCurrentRule({ ...currentRule, Status: e.target.checked ? 'Enabled' : 'Disabled' })
                }
                className="w-4 h-4 rounded border-border text-primary-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-semibold text-gray-200">Kích hoạt (Enabled)</span>
            </label>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-border bg-background/50 flex items-center space-x-2 shrink-0">
            {[
              { id: 'filter', label: '1. Bộ lọc (Filter)', icon: Tag },
              { id: 'expiration', label: '2. Xóa tự động (Expiration)', icon: Clock },
              { id: 'other', label: '3. Hành động khác (Multipart/Marker)', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-xs font-medium border-b-2 transition-all ${
                    isActive
                      ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: FILTER */}
            {activeTab === 'filter' && (
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-200">
                      Tiền tố áp dụng (Prefix)
                    </label>
                    <span className="text-[11px] font-medium text-purple-300">
                      {currentRule.Prefix ? `Đang lọc theo: "${currentRule.Prefix}"` : 'Áp dụng: Toàn bộ Bucket'}
                    </span>
                  </div>

                  {/* Option Select Box + Browse Tree Button */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={
                        currentRule.Prefix === ''
                          ? ''
                          : folderPrefixes.includes(currentRule.Prefix)
                          ? currentRule.Prefix
                          : '__CUSTOM__'
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '__CUSTOM__') {
                          setCurrentRule({ ...currentRule, Prefix: val });
                        }
                      }}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">📁 [Toàn bộ Bucket] - Áp dụng tất cả tập tin (Prefix trống)</option>
                      {folderPrefixes.length > 0 && (
                        <optgroup label="Thư mục hiện có trong Bucket">
                          {folderPrefixes.map((prefixKey) => (
                            <option key={prefixKey} value={prefixKey}>
                              📂 {prefixKey}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <option value="__CUSTOM__">✏️ Tùy chỉnh (Nhập hoặc sửa thủ công bên dưới)...</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setFolderBrowserOpen(true)}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs text-amber-300 hover:text-white transition-colors shrink-0 shadow-sm"
                      title="Mở cây thư mục (Browse to Folder)"
                    >
                      <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                      <span>Duyệt cây thư mục...</span>
                    </button>
                  </div>

                  {/* Editable Input Box */}
                  <div className="relative">
                    <input
                      type="text"
                      value={currentRule.Prefix}
                      onChange={(e) => setCurrentRule({ ...currentRule, Prefix: e.target.value })}
                      placeholder='Hoặc nhập tiền tố xác định tập tin (vd: "logs/" hoặc "backups/"). Để trống áp dụng toàn Bucket.'
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Bạn có thể chọn nhanh từ danh sách thư mục hiện có trong Bucket hoặc nhập trực tiếp tiền tố vào ô trên.
                  </p>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-200">
                      Thẻ phân loại (Object Tags - tuỳ chọn)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentRule({
                          ...currentRule,
                          Tags: [...currentRule.Tags, { Key: '', Value: '' }]
                        })
                      }
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-surface hover:bg-surface-hover text-xs text-purple-300 border border-border"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Tag</span>
                    </button>
                  </div>

                  {currentRule.Tags.length === 0 ? (
                    <div className="p-4 rounded-lg bg-surface/40 border border-dashed border-border text-center text-xs text-gray-400">
                      Chưa cấu hình Tag nào. Quy tắc sẽ chỉ lọc theo Prefix.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {currentRule.Tags.map((tag, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={tag.Key}
                            onChange={(e) => {
                              const updated = [...currentRule.Tags];
                              updated[idx].Key = e.target.value;
                              setCurrentRule({ ...currentRule, Tags: updated });
                            }}
                            placeholder="Key (vd: env)"
                            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs text-white"
                          />
                          <input
                            type="text"
                            value={tag.Value}
                            onChange={(e) => {
                              const updated = [...currentRule.Tags];
                              updated[idx].Value = e.target.value;
                              setCurrentRule({ ...currentRule, Tags: updated });
                            }}
                            placeholder="Value (vd: prod)"
                            className="flex-1 bg-background border border-border rounded px-3 py-1.5 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentRule({
                                ...currentRule,
                                Tags: currentRule.Tags.filter((_, i) => i !== idx)
                              });
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: EXPIRATION */}
            {activeTab === 'expiration' && (
              <div className="space-y-6 animate-fade-in">
                {/* Expiration for current versions */}
                <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentRule.enableExpiration}
                      onChange={(e) =>
                        setCurrentRule({
                          ...currentRule,
                          enableExpiration: e.target.checked,
                          enableExpiredDeleteMarker: e.target.checked ? false : currentRule.enableExpiredDeleteMarker
                        })
                      }
                      className="w-4 h-4 rounded border-border text-purple-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-100">
                      Xóa vĩnh viễn tập tin hiện tại (Permanently delete current versions)
                    </span>
                  </label>

                  {currentRule.enableExpiration && (
                    <div className="pl-6 flex items-center space-x-2 text-xs text-gray-300">
                      <span>Xóa sau số ngày kể từ ngày tạo tệp:</span>
                      <input
                        type="number"
                        min="1"
                        value={currentRule.expirationDays}
                        onChange={(e) =>
                          setCurrentRule({ ...currentRule, expirationDays: e.target.value })
                        }
                        className="w-24 bg-background border border-border rounded px-3 py-1.5 text-xs text-white"
                      />
                      <span>ngày</span>
                    </div>
                  )}
                </div>

                {/* Expiration for noncurrent versions */}
                <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentRule.enableNoncurrentExpiration}
                      onChange={(e) =>
                        setCurrentRule({
                          ...currentRule,
                          enableNoncurrentExpiration: e.target.checked
                        })
                      }
                      className="w-4 h-4 rounded border-border text-purple-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-100">
                      Xóa vĩnh viễn các phiên bản cũ (Permanently delete noncurrent versions)
                    </span>
                  </label>

                  {currentRule.enableNoncurrentExpiration && (
                    <div className="pl-6 flex items-center space-x-2 text-xs text-gray-300">
                      <span>Xóa sau số ngày kể từ khi tệp bị ghi đè thành phiên bản cũ:</span>
                      <input
                        type="number"
                        min="1"
                        value={currentRule.noncurrentExpirationDays}
                        onChange={(e) =>
                          setCurrentRule({ ...currentRule, noncurrentExpirationDays: e.target.value })
                        }
                        className="w-24 bg-background border border-border rounded px-3 py-1.5 text-xs text-white"
                      />
                      <span>ngày</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: OTHER ACTIONS */}
            {activeTab === 'other' && (
              <div className="space-y-6 animate-fade-in">
                {/* Abort incomplete multipart uploads */}
                <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-3">
                  <label className="flex items-center space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentRule.enableAbortMultipart}
                      onChange={(e) =>
                        setCurrentRule({ ...currentRule, enableAbortMultipart: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-border text-purple-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-100">
                      Hủy các tiến trình Upload Multipart dở dang (Uncompleted multipart uploads)
                    </span>
                  </label>

                  {currentRule.enableAbortMultipart && (
                    <div className="pl-6 flex items-center space-x-2 text-xs text-gray-300">
                      <span>Tự động hủy và dọn dẹp các mảnh upload sau:</span>
                      <input
                        type="number"
                        min="1"
                        value={currentRule.abortMultipartDays}
                        onChange={(e) =>
                          setCurrentRule({ ...currentRule, abortMultipartDays: e.target.value })
                        }
                        className="w-20 bg-background border border-border rounded px-3 py-1.5 text-xs text-white"
                      />
                      <span>ngày kể từ lúc bắt đầu upload</span>
                    </div>
                  )}
                </div>

                {/* Expired object delete markers */}
                <div className="p-4 rounded-xl border border-border bg-surface/40 space-y-3">
                  <label className={`flex items-center space-x-2.5 ${currentRule.enableExpiration ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      disabled={currentRule.enableExpiration}
                      checked={currentRule.enableExpiredDeleteMarker}
                      onChange={(e) =>
                        setCurrentRule({ ...currentRule, enableExpiredDeleteMarker: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-border text-purple-600 focus:ring-0"
                    />
                    <span className="text-xs font-semibold text-gray-100">
                      Tự động xóa Delete Marker hết hạn (Remove expired object delete markers)
                    </span>
                  </label>

                  {currentRule.enableExpiration && (
                    <p className="text-[11px] text-amber-400 pl-6">
                      Bạn không thể bật tùy chọn này khi đã bật Xóa vĩnh viễn tập tin hiện tại (Expiration for current versions).
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="h-16 px-6 border-t border-border bg-black/20 flex items-center justify-end space-x-3 shrink-0">
            <button
              onClick={() => {
                setEditingIndex(null);
                setCurrentRule(null);
              }}
              className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300"
            >
              Hủy
            </button>
            <button
              onClick={handleSaveCurrentRule}
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-500/20"
            >
              Hoàn tất quy tắc này
            </button>
          </div>
        </div>

        {/* Folder Tree Browser Modal */}
        <FolderBrowserModal
          isOpen={folderBrowserOpen}
          onClose={() => setFolderBrowserOpen(false)}
          bucket={bucket}
          initialPrefix={currentRule?.Prefix || ''}
          onSelectFolder={(selectedPrefix) => {
            setCurrentRule({ ...currentRule, Prefix: selectedPrefix });
          }}
        />
      </div>
    );
  }

  // Màn hình chính: Danh sách tất cả Lifecycle Rules của Bucket
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-card w-full max-w-3xl rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl max-h-[85vh]">
        <div className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-semibold text-white">
              Cấu hình Lifecycle Rules cho Bucket - {bucket}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Quản lý các quy tắc tự động xóa tập tin cũ (Expiration) và hủy upload Multipart dở dang cho S3
            </p>
            <button
              onClick={handleStartAddNewRule}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Quy tắc mới</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {ruleList.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400 border border-dashed border-border rounded-xl">
              <Activity className="w-10 h-10 mx-auto mb-2 text-gray-500 opacity-50" />
              Chưa cấu hình quy tắc Lifecycle nào cho Bucket này.
            </div>
          ) : (
            <div className="space-y-3">
              {ruleList.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-border bg-surface/70 hover:bg-surface transition-all flex items-center justify-between space-x-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-semibold text-sm text-gray-100">{rule.ID}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          rule.Status === 'Enabled'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {rule.Status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      <span>
                        Prefix:{' '}
                        <span className="text-purple-300 font-mono">
                          {rule.Prefix || '(Toàn Bucket)'}
                        </span>
                      </span>
                      {rule.enableExpiration && (
                        <span>• Xóa tệp sau {rule.expirationDays} ngày</span>
                      )}
                      {rule.enableNoncurrentExpiration && (
                        <span>• Xóa bản cũ sau {rule.noncurrentExpirationDays} ngày</span>
                      )}
                      {rule.enableAbortMultipart && (
                        <span>• Hủy Multipart sau {rule.abortMultipartDays} ngày</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartEditRule(idx)}
                      className="px-3 py-1.5 rounded-lg bg-background hover:bg-surface-hover border border-border text-xs text-gray-200 flex items-center space-x-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>Sửa</span>
                    </button>
                    <button
                      onClick={() => handleRemoveRule(idx)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                      title="Xóa quy tắc"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-16 px-6 border-t border-border bg-black/20 flex items-center justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-gray-300"
          >
            Đóng
          </button>
          <button
            onClick={handleSaveAllRulesToBucket}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 flex items-center space-x-2"
          >
            {saving && (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            <span>Lưu tất cả vào S3</span>
          </button>
        </div>
      </div>

      {/* Folder Tree Browser Modal */}
      <FolderBrowserModal
        isOpen={folderBrowserOpen}
        onClose={() => setFolderBrowserOpen(false)}
        bucket={bucket}
        initialPrefix={currentRule?.Prefix || ''}
        onSelectFolder={(selectedPrefix) => {
          setCurrentRule({ ...currentRule, Prefix: selectedPrefix });
        }}
      />
    </div>
  );
}
