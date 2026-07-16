// ==========================================================
// 🤫 SUPPRESS NODE & AWS SDK v3 MAINTENANCE WARNINGS
// ==========================================================
// File này phải được import đầu tiên ở mọi entry point của Electron
// để ngăn AWS SDK v3 phát ra cảnh báo NodeVersionSupportWarning
// do Electron hiện tại sử dụng Node v20.18.x nhúng bên trong.
// ==========================================================

process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';

const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning, type, code, ...args) {
  if (
    type === 'NodeVersionSupportWarning' ||
    code === 'NodeVersionSupportWarning' ||
    (typeof warning === 'string' && warning.includes('NodeVersionSupportWarning')) ||
    (warning && warning.name === 'NodeVersionSupportWarning') ||
    (warning && typeof warning.message === 'string' && warning.message.includes('NodeVersionSupportWarning')) ||
    (warning && typeof warning.stack === 'string' && warning.stack.includes('NodeVersionSupportWarning'))
  ) {
    return;
  }
  return originalEmitWarning.call(process, warning, type, code, ...args);
};
