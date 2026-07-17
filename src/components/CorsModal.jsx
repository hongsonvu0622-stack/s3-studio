import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  X,
  Edit2,
  AlertCircle,
  Check,
  Code,
  Sliders,
  ShieldAlert,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function CorsModal({ isOpen, onClose, bucket, rules, onSaveRules }) {
  if (!isOpen) return null;

  const [ruleList, setRuleList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [currentRule, setCurrentRule] = useState(null);
  const [activeTab, setActiveTab] = useState('visual'); // 'visual' | 'json'
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const initialRules = Array.isArray(rules) ? rules : [];
      setRuleList(initialRules);
      setJsonText(JSON.stringify(initialRules, null, 2));
      setEditingIndex(null);
      setCurrentRule(null);
      setError(null);
    }
  }, [isOpen, rules]);

  const handleCreateNewRule = () => {
    setCurrentRule({
      ID: `Rule-${Date.now()}`,
      AllowedOrigins: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: ['ETag'],
      MaxAgeSeconds: 3600
    });
    setEditingIndex(-1); // -1 nghĩa là thêm mới
  };

  const handleEditRule = (index) => {
    const r = ruleList[index];
    setCurrentRule({
      ID: r.ID || '',
      AllowedOrigins: r.AllowedOrigins ? [...r.AllowedOrigins] : ['*'],
      AllowedMethods: r.AllowedMethods ? [...r.AllowedMethods] : ['GET'],
      AllowedHeaders: r.AllowedHeaders ? [...r.AllowedHeaders] : ['*'],
      ExposeHeaders: r.ExposeHeaders ? [...r.ExposeHeaders] : [],
      MaxAgeSeconds: r.MaxAgeSeconds !== undefined ? r.MaxAgeSeconds : 3600
    });
    setEditingIndex(index);
  };

  const handleDeleteRule = (index) => {
    const updated = ruleList.filter((_, i) => i !== index);
    setRuleList(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    if (editingIndex === index) {
      setEditingIndex(null);
      setCurrentRule(null);
    }
  };

  const applyTemplate = (templateType) => {
    let t = {};
    if (templateType === 'public-all') {
      t = {
        ID: 'AllowAllOrigins',
        AllowedOrigins: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600
      };
    } else if (templateType === 'read-only') {
      t = {
        ID: 'AllowPublicRead',
        AllowedOrigins: ['*'],
        AllowedMethods: ['GET', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600
      };
    } else if (templateType === 'localhost') {
      t = {
        ID: 'AllowLocalhostDev',
        AllowedOrigins: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600
      };
    } else if (templateType === 'direct-upload') {
      t = {
        ID: 'AllowBrowserDirectUpload',
        AllowedOrigins: ['*'],
        AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag', 'x-amz-server-side-encryption'],
        MaxAgeSeconds: 3600
      };
    }
    setCurrentRule(t);
  };

  const handleSaveCurrentRule = () => {
    if (!currentRule.AllowedOrigins || currentRule.AllowedOrigins.length === 0) {
      setError('Vui lòng nhập ít nhất 1 Origin được phép (hoặc *)');
      return;
    }
    if (!currentRule.AllowedMethods || currentRule.AllowedMethods.length === 0) {
      setError('Vui lòng chọn ít nhất 1 phương thức (Method)');
      return;
    }

    setError(null);
    const updated = [...ruleList];
    const cleanedRule = {
      ...(currentRule.ID ? { ID: currentRule.ID.trim() } : {}),
      AllowedOrigins: currentRule.AllowedOrigins.filter(o => o.trim() !== ''),
      AllowedMethods: currentRule.AllowedMethods,
      ...(currentRule.AllowedHeaders && currentRule.AllowedHeaders.length > 0
        ? { AllowedHeaders: currentRule.AllowedHeaders.filter(h => h.trim() !== '') }
        : {}),
      ...(currentRule.ExposeHeaders && currentRule.ExposeHeaders.length > 0
        ? { ExposeHeaders: currentRule.ExposeHeaders.filter(h => h.trim() !== '') }
        : {}),
      ...(currentRule.MaxAgeSeconds !== undefined ? { MaxAgeSeconds: Number(currentRule.MaxAgeSeconds) } : {})
    };

    if (editingIndex === -1) {
      updated.push(cleanedRule);
    } else {
      updated[editingIndex] = cleanedRule;
    }

    setRuleList(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    setEditingIndex(null);
    setCurrentRule(null);
  };

  const handleToggleMethod = (method) => {
    if (!currentRule) return;
    const methods = currentRule.AllowedMethods || [];
    if (methods.includes(method)) {
      setCurrentRule({ ...currentRule, AllowedMethods: methods.filter(m => m !== method) });
    } else {
      setCurrentRule({ ...currentRule, AllowedMethods: [...methods, method] });
    }
  };

  const handleSaveAll = async () => {
    let finalRules = ruleList;
    if (activeTab === 'json') {
      try {
        finalRules = JSON.parse(jsonText);
        if (!Array.isArray(finalRules)) {
          setError('Cú pháp JSON phải là một mảng (Array) các đối tượng CORSRule.');
          return;
        }
      } catch (e) {
        setError('Cú pháp JSON không hợp lệ: ' + e.message);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      await onSaveRules(bucket, finalRules);
      onClose();
    } catch (err) {
      setError('Lỗi lưu cấu hình CORS: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getMethodBadgeClass = (m) => {
    switch (m) {
      case 'GET': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'PUT': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'POST': return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'DELETE': return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'HEAD': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Cấu hình CORS (Cross-Origin Resource Sharing)</h2>
              <p className="text-xs text-gray-400">
                Bucket: <span className="text-accent-400 font-medium">{bucket}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border bg-surface/50 px-6 pt-2 space-x-2">
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'visual'
                ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Trực quan (Visual Editor)</span>
          </button>
          <button
            onClick={() => {
              setJsonText(JSON.stringify(ruleList, null, 2));
              setActiveTab('json');
            }}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-indigo-400 text-indigo-400 bg-indigo-500/10 rounded-t-lg'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Mã JSON (Raw JSON)</span>
          </button>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mx-6 mt-4 flex items-center space-x-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'visual' ? (
            editingIndex !== null && currentRule ? (
              /* Rule Form Editor */
              <div className="bg-surface-hover/40 border border-indigo-500/40 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-sm font-semibold text-indigo-300 flex items-center space-x-2">
                    <Edit2 className="w-4 h-4 text-indigo-400" />
                    <span>{editingIndex === -1 ? 'Thêm quy tắc CORS mới' : `Chỉnh sửa quy tắc #${editingIndex + 1}`}</span>
                  </h3>
                  <button
                    onClick={() => { setEditingIndex(null); setCurrentRule(null); }}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Hủy sửa
                  </button>
                </div>

                {/* Templates */}
                <div className="bg-black/20 p-3 rounded-lg border border-border/50 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Mẫu nhanh (Quick Templates):</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate('public-all')}
                      className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-indigo-500/20 text-gray-300 hover:text-indigo-300 border border-border transition-colors"
                    >
                      🌐 Cho phép tất cả (*)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('read-only')}
                      className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-emerald-500/20 text-gray-300 hover:text-emerald-300 border border-border transition-colors"
                    >
                      📖 Chỉ đọc (Read-Only GET, HEAD)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('direct-upload')}
                      className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-blue-500/20 text-gray-300 hover:text-blue-300 border border-border transition-colors"
                    >
                      ⚡ Trình duyệt tải lên trực tiếp (Presigned Upload)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate('localhost')}
                      className="px-2.5 py-1 text-[11px] rounded bg-surface hover:bg-purple-500/20 text-gray-300 hover:text-purple-300 border border-border transition-colors"
                    >
                      💻 Localhost Dev (3000, 5173)
                    </button>
                  </div>
                </div>

                {/* ID & MaxAge */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Tên định danh quy tắc (ID - không bắt buộc)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: AllowWebApp"
                      value={currentRule.ID || ''}
                      onChange={(e) => setCurrentRule({ ...currentRule, ID: e.target.value })}
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Thời gian lưu Cache (MaxAgeSeconds)
                    </label>
                    <input
                      type="number"
                      placeholder="3600"
                      value={currentRule.MaxAgeSeconds !== undefined ? currentRule.MaxAgeSeconds : ''}
                      onChange={(e) => setCurrentRule({ ...currentRule, MaxAgeSeconds: e.target.value })}
                      className="w-full bg-black/40 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Allowed Origins */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Các tên miền được phép (AllowedOrigins - Mỗi dòng 1 origin hoặc ký tự *)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="https://mydomain.com&#10;http://localhost:3000&#10;*"
                    value={(currentRule.AllowedOrigins || []).join('\n')}
                    onChange={(e) => setCurrentRule({ ...currentRule, AllowedOrigins: e.target.value.split('\n') })}
                    className="w-full bg-black/40 border border-border rounded-lg p-2.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Allowed Methods */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Các phương thức HTTP được phép (AllowedMethods)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['GET', 'PUT', 'POST', 'DELETE', 'HEAD'].map((method) => {
                      const isSelected = (currentRule.AllowedMethods || []).includes(method);
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => handleToggleMethod(method)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                            isSelected
                              ? getMethodBadgeClass(method) + ' shadow-sm scale-105 ring-1 ring-white/20'
                              : 'bg-black/30 border-border text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          <span>{method}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allowed Headers & Expose Headers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      AllowedHeaders (Mỗi dòng 1 Header hoặc *)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="*&#10;Authorization&#10;Content-Type"
                      value={(currentRule.AllowedHeaders || []).join('\n')}
                      onChange={(e) => setCurrentRule({ ...currentRule, AllowedHeaders: e.target.value.split('\n') })}
                      className="w-full bg-black/40 border border-border rounded-lg p-2.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      ExposeHeaders (Mỗi dòng 1 Header, VD: ETag)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ETag&#10;x-amz-server-side-encryption"
                      value={(currentRule.ExposeHeaders || []).join('\n')}
                      onChange={(e) => setCurrentRule({ ...currentRule, ExposeHeaders: e.target.value.split('\n') })}
                      className="w-full bg-black/40 border border-border rounded-lg p-2.5 text-xs text-white font-mono placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex justify-end space-x-2 pt-2 border-t border-border/60">
                  <button
                    type="button"
                    onClick={() => { setEditingIndex(null); setCurrentRule(null); }}
                    className="px-4 py-1.5 rounded-lg border border-border text-xs text-gray-300 hover:bg-surface transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrentRule}
                    className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Áp dụng quy tắc này</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Rule Cards List */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Danh sách các quy tắc CORS hiện đang áp dụng trên Bucket <strong className="text-white">{bucket}</strong>.
                  </p>
                  <button
                    onClick={handleCreateNewRule}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md shadow-indigo-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm quy tắc CORS</span>
                  </button>
                </div>

                {ruleList.length === 0 ? (
                  <div className="bg-surface-hover/20 border border-dashed border-border rounded-xl p-8 text-center space-y-3">
                    <Globe className="w-10 h-10 text-gray-500 mx-auto opacity-50" />
                    <div>
                      <p className="text-sm font-medium text-gray-300">Bucket chưa thiết lập quy tắc CORS nào</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        CORS cho phép các trang web hoặc ứng dụng bên thứ ba truy cập trực tiếp vào dữ liệu trong Bucket từ trình duyệt của người dùng.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateNewRule}
                      className="px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors inline-flex items-center space-x-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm quy tắc đầu tiên ngay</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {ruleList.map((rule, idx) => (
                      <div
                        key={idx}
                        className="bg-surface-hover/30 border border-border rounded-xl p-4 hover:border-indigo-500/40 transition-all flex flex-col space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[11px] font-mono font-bold border border-indigo-500/30">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-white truncate max-w-[200px]">
                              {rule.ID || `Quy tắc không tên`}
                            </span>
                            {rule.MaxAgeSeconds !== undefined && (
                              <span className="text-[11px] text-gray-400 bg-black/30 px-2 py-0.5 rounded border border-border/50">
                                MaxAge: {rule.MaxAgeSeconds}s
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleEditRule(idx)}
                              className="p-1.5 rounded-lg hover:bg-surface text-gray-400 hover:text-indigo-400 transition-colors"
                              title="Chỉnh sửa quy tắc"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(idx)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                              title="Xóa quy tắc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-400 block mb-1">Allowed Origins:</span>
                            <div className="flex flex-wrap gap-1">
                              {(rule.AllowedOrigins || []).map((orig, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-black/40 text-gray-200 font-mono text-[11px] border border-border">
                                  {orig}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-1">Allowed Methods:</span>
                            <div className="flex flex-wrap gap-1">
                              {(rule.AllowedMethods || []).map((method, i) => (
                                <span key={i} className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getMethodBadgeClass(method)}`}>
                                  {method}
                                </span>
                              ))}
                            </div>
                          </div>
                          {rule.AllowedHeaders && rule.AllowedHeaders.length > 0 && (
                            <div>
                              <span className="text-gray-400 block mb-1">Allowed Headers:</span>
                              <div className="flex flex-wrap gap-1">
                                {rule.AllowedHeaders.map((h, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-black/40 text-gray-300 font-mono text-[11px] border border-border">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {rule.ExposeHeaders && rule.ExposeHeaders.length > 0 && (
                            <div>
                              <span className="text-gray-400 block mb-1">Expose Headers:</span>
                              <div className="flex flex-wrap gap-1">
                                {rule.ExposeHeaders.map((h, i) => (
                                  <span key={i} className="px-2 py-0.5 rounded bg-black/40 text-gray-300 font-mono text-[11px] border border-border">
                                    {h}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            /* JSON Raw Editor */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Bạn có thể chỉnh sửa trực tiếp chuỗi JSON Array chứa các quy tắc CORS:</span>
                <button
                  type="button"
                  onClick={() => setJsonText(JSON.stringify(ruleList, null, 2))}
                  className="text-indigo-400 hover:underline"
                >
                  Định dạng lại (Format JSON)
                </button>
              </div>
              <textarea
                rows={14}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full bg-black/60 border border-border rounded-xl p-4 font-mono text-xs text-gray-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-hover/30">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Mẹo: Cấu hình CORS cần thiết để tải file lên từ Trình duyệt bằng Presigned URL.</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-border text-xs text-gray-300 hover:bg-surface transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving || (activeTab === 'visual' && editingIndex !== null)}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Lưu cấu hình CORS lên S3</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
