import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import s3Service from './s3Service.js';
import electronUpdater from 'electron-updater';
const autoUpdater = electronUpdater.autoUpdater || electronUpdater;

// Tắt cảnh báo bảo trì NodeVersionSupportWarning của AWS SDK v3
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, fs.existsSync(path.join(__dirname, '../public/logo.png')) ? '../public/logo.png' : '../dist/logo.png');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: 'S3 Studio - Cross-Platform S3 Explorer',
    icon: iconPath,
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  s3Service.setMainWindow(mainWindow);

  const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && process.env.NODE_ENV !== 'production');
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    if (mainWindow) mainWindow.webContents.send('updater:checking');
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater:available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater:not-available', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) mainWindow.webContents.send('updater:progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow) mainWindow.webContents.send('updater:downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    if (mainWindow) mainWindow.webContents.send('updater:error', err.message || err.toString());
  });

  ipcMain.handle('updater:check', async () => {
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      return { status: 'dev-mode', message: 'Tự động cập nhật chỉ chạy trên bản cài đặt chính thức (.exe, .dmg).' };
    }
    try {
      const res = await autoUpdater.checkForUpdates();
      return { status: 'checking', res };
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  });

  ipcMain.handle('updater:restart', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => console.error('Auto update check failed:', err));
    }, 3000);
  }
}

app.whenReady().then(() => {
  setupIpcHandlers();
  setupAutoUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function setupIpcHandlers() {
  ipcMain.handle('s3:openExternal', (_, url) => shell.openExternal(url));
  ipcMain.handle('s3:getAppVersion', () => app.getVersion());
  // Profiles
  ipcMain.handle('s3:getProfiles', () => s3Service.profiles);
  ipcMain.handle('s3:saveProfiles', (_, profiles) => s3Service.saveProfiles(profiles));
  ipcMain.handle('s3:importRcloneConfig', (_, filePath) => s3Service.importRcloneConfig(filePath));
  ipcMain.handle('s3:connectProfile', (_, id) => s3Service.connectProfile(id));
  ipcMain.handle('s3:testConnection', (_, profile) => s3Service.testConnection(profile));

  // Buckets
  ipcMain.handle('s3:listBuckets', () => s3Service.listBuckets());
  ipcMain.handle('s3:createBucket', (_, name, region) => s3Service.createBucket(name, region));
  ipcMain.handle('s3:deleteBucket', (_, name) => s3Service.deleteBucket(name));

  // Objects & Versioning
  ipcMain.handle('s3:listObjects', (_, bucket, prefix, delimiter, showVersions, options) =>
    s3Service.listObjects(bucket, prefix, delimiter, showVersions, options)
  );
  ipcMain.handle('s3:searchObjects', (_, bucket, query, prefix, maxResults) =>
    s3Service.searchObjects(bucket, query, prefix, maxResults)
  );
  ipcMain.handle('s3:getBucketVersioning', (_, bucket) => s3Service.getBucketVersioning(bucket));
  ipcMain.handle('s3:putBucketVersioning', (_, bucket, status) => s3Service.putBucketVersioning(bucket, status));
  ipcMain.handle('s3:restoreObjectVersion', (_, bucket, key, versionId) =>
    s3Service.restoreObjectVersion(bucket, key, versionId)
  );
  ipcMain.handle('s3:deleteObjects', (_, bucket, objects) => s3Service.deleteObjects(bucket, objects));
  ipcMain.handle('s3:copyObject', (_, sourceBucket, sourceKey, destBucket, destKey) =>
    s3Service.copyObject(sourceBucket, sourceKey, destBucket, destKey)
  );
  ipcMain.handle('s3:moveObject', (_, sourceBucket, sourceKey, destBucket, destKey) =>
    s3Service.moveObject(sourceBucket, sourceKey, destBucket, destKey)
  );

  // Advanced management
  ipcMain.handle('s3:getBucketPolicy', (_, bucket) => s3Service.getBucketPolicy(bucket));
  ipcMain.handle('s3:putBucketPolicy', (_, bucket, policyText) => s3Service.putBucketPolicy(bucket, policyText));
  ipcMain.handle('s3:deleteBucketPolicy', (_, bucket) => s3Service.deleteBucketPolicy(bucket));
  ipcMain.handle('s3:getBucketAcl', (_, bucket) => s3Service.getBucketAcl(bucket));
  ipcMain.handle('s3:putBucketAcl', (_, bucket, acl) => s3Service.putBucketAcl(bucket, acl));
  ipcMain.handle('s3:getObjectAcl', (_, bucket, key) => s3Service.getObjectAcl(bucket, key));
  ipcMain.handle('s3:putObjectAcl', (_, bucket, key, acl) => s3Service.putObjectAcl(bucket, key, acl));
  ipcMain.handle('s3:getBucketLifecycle', (_, bucket) => s3Service.getBucketLifecycle(bucket));
  ipcMain.handle('s3:putBucketLifecycle', (_, bucket, rules) => s3Service.putBucketLifecycle(bucket, rules));
  ipcMain.handle('s3:getBucketCors', (_, bucket) => s3Service.getBucketCors(bucket));
  ipcMain.handle('s3:putBucketCors', (_, bucket, rules) => s3Service.putBucketCors(bucket, rules));
  ipcMain.handle('s3:generatePresignedUrl', (_, bucket, key, expires) =>
    s3Service.generatePresignedUrl(bucket, key, expires)
  );
  ipcMain.handle('s3:getPublicUrl', (_, bucket, key) => s3Service.getPublicUrl(bucket, key));
  ipcMain.handle('s3:getObjectMetadata', (_, bucket, key) => s3Service.getObjectMetadata(bucket, key));

  // Transfer queue & dialogs
  ipcMain.handle('dialog:selectUploadFiles', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn tập tin để tải lên S3',
      properties: ['openFile', 'multiSelections']
    });
    return res.filePaths;
  });

  ipcMain.handle('dialog:selectSaveDirectory', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chọn thư mục lưu tập tin tải về',
      properties: ['openDirectory', 'createDirectory']
    });
    return res.filePaths?.[0] || null;
  });

  ipcMain.handle('s3:addUploadTask', (_, bucket, prefix, filePath) =>
    s3Service.addUploadTask(bucket, prefix, filePath)
  );
  ipcMain.handle('s3:addDownloadTask', (_, bucket, key, savePath) =>
    s3Service.addDownloadTask(bucket, key, savePath)
  );
  ipcMain.handle('s3:getTransferQueue', () => s3Service.getTransferQueue());
  ipcMain.handle('s3:setConcurrencyLevel', (_, level) => s3Service.setConcurrencyLevel(level));
  ipcMain.handle('s3:cancelTask', (_, id) => s3Service.cancelTask(id));
  ipcMain.handle('s3:clearCompletedTasks', () => s3Service.clearCompletedTasks());
}
