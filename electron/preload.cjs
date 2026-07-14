const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPathForFile: (file) => (webUtils && webUtils.getPathForFile ? webUtils.getPathForFile(file) : file.path),
  // Profiles & Connection
  getProfiles: () => ipcRenderer.invoke('s3:getProfiles'),
  saveProfiles: (profiles) => ipcRenderer.invoke('s3:saveProfiles', profiles),
  importRcloneConfig: (filePath) => ipcRenderer.invoke('s3:importRcloneConfig', filePath),
  connectProfile: (profileId) => ipcRenderer.invoke('s3:connectProfile', profileId),
  testConnection: (profile) => ipcRenderer.invoke('s3:testConnection', profile),

  // Buckets
  listBuckets: () => ipcRenderer.invoke('s3:listBuckets'),
  createBucket: (bucketName, region) => ipcRenderer.invoke('s3:createBucket', bucketName, region),
  deleteBucket: (bucketName) => ipcRenderer.invoke('s3:deleteBucket', bucketName),

  // Objects & Versioning
  listObjects: (bucketName, prefix, delimiter, showVersions, options) =>
    ipcRenderer.invoke('s3:listObjects', bucketName, prefix, delimiter, showVersions, options),
  searchObjects: (bucketName, query, prefix, maxResults) =>
    ipcRenderer.invoke('s3:searchObjects', bucketName, query, prefix, maxResults),
  getBucketVersioning: (bucketName) => ipcRenderer.invoke('s3:getBucketVersioning', bucketName),
  putBucketVersioning: (bucketName, status) => ipcRenderer.invoke('s3:putBucketVersioning', bucketName, status),
  restoreObjectVersion: (bucketName, key, versionId) =>
    ipcRenderer.invoke('s3:restoreObjectVersion', bucketName, key, versionId),
  deleteObjects: (bucketName, objects) => ipcRenderer.invoke('s3:deleteObjects', bucketName, objects),
  copyObject: (sourceBucket, sourceKey, destBucket, destKey) =>
    ipcRenderer.invoke('s3:copyObject', sourceBucket, sourceKey, destBucket, destKey),
  moveObject: (sourceBucket, sourceKey, destBucket, destKey) =>
    ipcRenderer.invoke('s3:moveObject', sourceBucket, sourceKey, destBucket, destKey),

  // Policies, ACLs, Lifecycle, CORS, Presigned URL
  getBucketPolicy: (bucketName) => ipcRenderer.invoke('s3:getBucketPolicy', bucketName),
  putBucketPolicy: (bucketName, policyText) => ipcRenderer.invoke('s3:putBucketPolicy', bucketName, policyText),
  deleteBucketPolicy: (bucketName) => ipcRenderer.invoke('s3:deleteBucketPolicy', bucketName),
  getBucketAcl: (bucketName) => ipcRenderer.invoke('s3:getBucketAcl', bucketName),
  putBucketAcl: (bucketName, cannedAcl) => ipcRenderer.invoke('s3:putBucketAcl', bucketName, cannedAcl),
  getObjectAcl: (bucketName, key) => ipcRenderer.invoke('s3:getObjectAcl', bucketName, key),
  putObjectAcl: (bucketName, key, cannedAcl) => ipcRenderer.invoke('s3:putObjectAcl', bucketName, key, cannedAcl),
  getBucketLifecycle: (bucketName) => ipcRenderer.invoke('s3:getBucketLifecycle', bucketName),
  putBucketLifecycle: (bucketName, rules) => ipcRenderer.invoke('s3:putBucketLifecycle', bucketName, rules),
  getBucketCors: (bucketName) => ipcRenderer.invoke('s3:getBucketCors', bucketName),
  putBucketCors: (bucketName, rules) => ipcRenderer.invoke('s3:putBucketCors', bucketName, rules),
  generatePresignedUrl: (bucketName, key, expiresInSeconds) =>
    ipcRenderer.invoke('s3:generatePresignedUrl', bucketName, key, expiresInSeconds),
  getPublicUrl: (bucketName, key) => ipcRenderer.invoke('s3:getPublicUrl', bucketName, key),
  getObjectMetadata: (bucketName, key) => ipcRenderer.invoke('s3:getObjectMetadata', bucketName, key),

  // Transfer Queue & Dialogs
  selectUploadFiles: () => ipcRenderer.invoke('dialog:selectUploadFiles'),
  selectSaveDirectory: () => ipcRenderer.invoke('dialog:selectSaveDirectory'),
  addUploadTask: (bucketName, prefix, filePath) =>
    ipcRenderer.invoke('s3:addUploadTask', bucketName, prefix, filePath),
  addDownloadTask: (bucketName, key, savePath) =>
    ipcRenderer.invoke('s3:addDownloadTask', bucketName, key, savePath),
  getTransferQueue: () => ipcRenderer.invoke('s3:getTransferQueue'),
  setConcurrencyLevel: (level) => ipcRenderer.invoke('s3:setConcurrencyLevel', level),
  cancelTask: (taskId) => ipcRenderer.invoke('s3:cancelTask', taskId),
  clearCompletedTasks: () => ipcRenderer.invoke('s3:clearCompletedTasks'),
  onQueueUpdate: (callback) => {
    const listener = (event, queue) => callback(queue);
    ipcRenderer.on('transfer-queue-update', listener);
    return () => ipcRenderer.removeListener('transfer-queue-update', listener);
  },
  onTransferCompleted: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('transfer-completed', listener);
    return () => ipcRenderer.removeListener('transfer-completed', listener);
  }
});
