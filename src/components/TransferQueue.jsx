import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  Trash2,
  ChevronUp,
  ChevronDown,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function TransferQueue({ queue, concurrencyLevel, onSetConcurrency, onCancelTask, onClearCompleted }) {
  const [isMinimized, setIsMinimized] = useState(false);

  const activeTasks = queue.filter(t => t.status === 'active');
  const pendingTasks = queue.filter(t => t.status === 'pending');
  const completedTasks = queue.filter(t => t.status === 'completed');
  const failedTasks = queue.filter(t => t.status === 'failed');

  if (queue.length === 0 && isMinimized) return null;

  return (
    <div className="border-t border-border bg-surface/90 backdrop-blur-md flex flex-col shrink-0 transition-all select-none z-20">
      {/* Dock Bar */}
      <div
        onClick={() => setIsMinimized(!isMinimized)}
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-surface-hover/60 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <Activity className="w-4 h-4 text-primary-400" />
          <span className="text-xs font-semibold text-gray-200">
            Hàng đợi Truyền tải Đa luồng (Multi-Threaded Queue)
          </span>

          <div className="flex items-center space-x-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 font-medium">
              Đang chạy: {activeTasks.length}
            </span>
            {pendingTasks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                Chờ: {pendingTasks.length}
              </span>
            )}
            {completedTasks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                Xong: {completedTasks.length}
              </span>
            )}
            {failedTasks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                Lỗi: {failedTasks.length}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center space-x-1.5 text-xs text-gray-400">
            <span>Luồng song song:</span>
            <select
              value={concurrencyLevel}
              onChange={(e) => onSetConcurrency(parseInt(e.target.value, 10))}
              className="bg-background border border-border rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
            >
              <option value={2}>2 Luồng</option>
              <option value={3}>3 Luồng</option>
              <option value={5}>5 Luồng</option>
              <option value={10}>10 Luồng</option>
            </select>
          </div>

          <button
            onClick={onClearCompleted}
            className="flex items-center space-x-1 px-2 py-1 rounded bg-background hover:bg-surface border border-border text-xs text-gray-300 hover:text-white"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa mục xong</span>
          </button>

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-gray-400 hover:text-white"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Queue List */}
      {!isMinimized && (
        <div className="max-h-56 overflow-y-auto divide-y divide-border/40 text-xs">
          {queue.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Hàng đợi truyền tải đang trống</div>
          ) : (
            queue.map((task) => (
              <div
                key={task.id}
                className="px-4 py-2.5 flex items-center justify-between hover:bg-surface/50 transition-colors"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                  {task.type === 'UPLOAD' ? (
                    <ArrowUpRight className="w-4 h-4 text-primary-400 shrink-0" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4 text-accent-400 shrink-0" />
                  )}
                  <div className="truncate pr-4">
                    <div className="font-medium text-gray-200 truncate flex items-center space-x-2">
                      <span className="truncate">{task.key}</span>
                      {task.mode && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide border shrink-0 ${
                            task.mode === 'MULTIPART'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}
                        >
                          {task.mode === 'MULTIPART' ? '⚡ MULTIPART (8 LUỒNG)' : 'SINGLE STREAM'}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      Bucket: {task.bucket} | {task.filePath}
                    </div>

                    {/* Visual Chunks Progress Bar */}
                    {task.mode === 'MULTIPART' && task.totalParts && task.totalParts > 1 && (
                      <div className="mt-1.5 flex items-center space-x-1.5">
                        <span className="text-[9px] text-gray-400 shrink-0 font-mono">
                          Chunks ({task.completedParts || 0}/{task.totalParts}):
                        </span>
                        <div className="flex items-center space-x-0.5 overflow-hidden max-w-xs py-0.5">
                          {Array.from({ length: Math.min(task.totalParts, 28) }).map((_, i) => {
                            const completedCount = task.completedParts || 0;
                            const isCompleted = i < completedCount || task.status === 'completed';
                            const isUploading = i >= completedCount && i < completedCount + 8 && task.status === 'active';
                            return (
                              <div
                                key={i}
                                title={`Part #${i + 1}`}
                                className={`h-2 w-2 rounded-xs transition-all duration-300 ${
                                  isCompleted
                                    ? 'bg-emerald-400 shadow-xs shadow-emerald-500/50'
                                    : isUploading
                                    ? 'bg-purple-400 animate-pulse'
                                    : 'bg-border'
                                }`}
                              />
                            );
                          })}
                          {task.totalParts > 28 && (
                            <span className="text-[9px] text-gray-400 ml-1">+{task.totalParts - 28}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-6 shrink-0">
                  <span className="font-mono text-gray-300 w-20 text-right">{task.speed}</span>

                  {/* Progress Bar */}
                  <div className="w-32">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                      <span>Tiến độ</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          task.status === 'completed'
                            ? 'bg-emerald-500'
                            : task.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-primary-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="w-24 text-right">
                    {task.status === 'active' && (
                      <span className="px-2 py-0.5 rounded bg-primary-500/20 text-primary-300 text-[10px]">
                        Đang chạy...
                      </span>
                    )}
                    {task.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                        Đang chờ...
                      </span>
                    )}
                    {task.status === 'completed' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center justify-end space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Xong</span>
                      </span>
                    )}
                    {task.status === 'failed' && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] flex items-center justify-end space-x-1" title={task.error}>
                        <AlertCircle className="w-3 h-3" />
                        <span>Lỗi</span>
                      </span>
                    )}
                    {task.status === 'canceled' && (
                      <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-300 text-[10px] flex items-center justify-end space-x-1">
                        <XCircle className="w-3 h-3" />
                        <span>Đã hủy</span>
                      </span>
                    )}
                  </div>

                  {(task.status === 'pending' || task.status === 'active') && (
                    <button
                      onClick={() => onCancelTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      title="Hủy tác vụ này ngay lập tức"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
