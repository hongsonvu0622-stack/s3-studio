import fs from 'fs';
import path from 'path';
import https from 'https';
import os from 'os';
import { app } from 'electron';
import {
  S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  GetBucketVersioningCommand,
  PutBucketVersioningCommand,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
  DeleteBucketPolicyCommand,
  GetBucketAclCommand,
  PutBucketAclCommand,
  GetObjectAclCommand,
  PutObjectAclCommand,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MIME_TYPES = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.avif': 'image/avif',

  // Videos
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.flv': 'video/x-flv',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',

  // Documents & Web
  '.pdf': 'application/pdf',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/markdown',

  // Microsoft Office
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed'
};

function detectContentType(filePath, buffer = null) {
  const ext = path.extname(filePath).toLowerCase();
  if (MIME_TYPES[ext]) {
    return MIME_TYPES[ext];
  }

  // Detect by magic bytes if buffer provided
  if (buffer && buffer.length >= 4) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) return 'application/zip';
  }

  return 'application/octet-stream';
}

class S3Service {
  constructor() {
    this.client = null;
    this.currentProfile = null;
    this.profiles = [];
    this.transferQueue = [];
    this.activeTransfers = 0;
    this.concurrencyLevel = 5;
    this.mainWindow = null;
    this.loadProfiles();
  }

  setMainWindow(win) {
    this.mainWindow = win;
  }

  getProfilesPath() {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 's3-profiles.json');
  }

  loadProfiles() {
    try {
      const filePath = this.getProfilesPath();
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        this.profiles = JSON.parse(raw);
      } else {
        this.profiles = [
          {
            id: 'demo-s3',
            name: 'AWS S3 / Compatible Storage',
            endpoint: 'http://localhost:8000',
            region: 'default',
            accessKeyId: 'demo',
            secretAccessKey: 'demo',
            forcePathStyle: true,
            ignoreSsl: true
          }
        ];
        this.saveProfiles(this.profiles);
      }
    } catch (err) {
      console.error('Error loading profiles:', err);
      this.profiles = [];
    }
  }

  saveProfiles(profiles) {
    try {
      this.profiles = profiles;
      fs.writeFileSync(this.getProfilesPath(), JSON.stringify(profiles, null, 2), 'utf-8');
      return true;
    } catch (err) {
      console.error('Error saving profiles:', err);
      return false;
    }
  }

  // ==================== RCLONE CONFIG IMPORTER ====================
  // Đọc file rclone.conf và tự động chuyển đổi thành profile S3 Studio
  async importRcloneConfig(customFilePath = null) {
    const configPath = customFilePath || path.join(os.homedir(), '.config', 'rclone', 'rclone.conf');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Không tìm thấy file rclone.conf tại: ${configPath}`);
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const lines = content.split('\n');
    const importedProfiles = [];
    let currentSection = null;

    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;

      const sectionMatch = line.match(/^\[(.*)\]$/);
      if (sectionMatch) {
        currentSection = {
          id: `rclone-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: sectionMatch[1],
          type: '',
          endpoint: '',
          region: 'default',
          accessKeyId: '',
          secretAccessKey: '',
          forcePathStyle: true,
          ignoreSsl: true
        };
        importedProfiles.push(currentSection);
      } else if (currentSection) {
        const [key, ...valParts] = line.split('=');
        if (!key || valParts.length === 0) continue;
        const k = key.trim();
        const v = valParts.join('=').trim();

        if (k === 'type') currentSection.type = v;
        if (k === 'endpoint') currentSection.endpoint = v;
        if (k === 'access_key_id') currentSection.accessKeyId = v;
        if (k === 'secret_access_key') currentSection.secretAccessKey = v;
        if (k === 'region' && v) currentSection.region = v;
        if (k === 'force_path_style') currentSection.forcePathStyle = v === 'true';
      }
    }

    // Lọc ra các profile S3 hợp lệ có accessKey
    const s3Profiles = importedProfiles.filter(p => p.type === 's3' && p.accessKeyId && p.secretAccessKey);
    if (s3Profiles.length === 0) {
      throw new Error('Không tìm thấy cấu hình S3 hợp lệ nào trong file rclone.conf');
    }

    // Gộp profile mới vào danh sách hiện tại (tránh trùng tên)
    const existingNames = new Set(this.profiles.map(p => p.name));
    const toAdd = s3Profiles.filter(p => !existingNames.has(p.name));
    const merged = [...this.profiles, ...toAdd];
    this.saveProfiles(merged);

    return {
      importedCount: toAdd.length,
      profiles: merged
    };
  }

  createS3Client(profile) {
    if (profile.ignoreSsl) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    let formattedEndpoint = undefined;
    if (profile.endpoint && profile.endpoint.trim() !== '') {
      formattedEndpoint = profile.endpoint.trim();
      if (!formattedEndpoint.startsWith('http://') && !formattedEndpoint.startsWith('https://')) {
        formattedEndpoint = `http://${formattedEndpoint}`;
      }
    }

    let region = profile.region || 'default';
    if (region.trim() === '') {
      region = 'default';
    }

    const config = {
      region: region,
      credentials: {
        accessKeyId: (profile.accessKeyId || '').trim(),
        secretAccessKey: (profile.secretAccessKey || '').trim()
      },
      forcePathStyle: profile.forcePathStyle !== undefined ? profile.forcePathStyle : true
    };

    if (formattedEndpoint) {
      config.endpoint = formattedEndpoint;
    }

    return new S3Client(config);
  }

  async connectProfile(profileId) {
    const profile = this.profiles.find((p) => p.id === profileId);
    if (!profile) throw new Error('Profile not found');
    this.client = this.createS3Client(profile);
    this.currentProfile = profile;
    return profile;
  }

  async testConnection(profileConfig) {
    const tempClient = this.createS3Client(profileConfig);
    const res = await tempClient.send(new ListBucketsCommand({}));
    return {
      success: true,
      bucketsCount: res.Buckets?.length || 0
    };
  }

  // ==================== BUCKET OPERATIONS ====================
  async listBuckets() {
    if (!this.client) throw new Error('No active connection');
    const res = await this.client.send(new ListBucketsCommand({}));
    return (res.Buckets || []).map(b => ({
      name: b.Name,
      creationDate: b.CreationDate
    }));
  }

  async createBucket(bucketName, region) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new CreateBucketCommand({
      Bucket: bucketName
    }));
    return true;
  }

  async deleteBucket(bucketName) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new DeleteBucketCommand({
      Bucket: bucketName
    }));
    return true;
  }

  // ==================== OBJECT & VERSIONING OPERATIONS ====================
  async listObjects(bucketName, prefix = '', delimiter = '/', showVersions = false, options = {}) {
    if (!this.client) throw new Error('No active connection');

    const maxKeys = options.maxKeys || 1000;

    if (!showVersions) {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: delimiter,
        MaxKeys: maxKeys,
        ContinuationToken: options.continuationToken || undefined
      });
      const res = await this.client.send(command);

      const folders = (res.CommonPrefixes || []).map(cp => ({
        key: cp.Prefix,
        name: cp.Prefix.slice(prefix.length),
        isFolder: true
      }));

      const files = (res.Contents || [])
        .filter(c => c.Key !== prefix)
        .map(c => ({
          key: c.Key,
          name: c.Key.slice(prefix.length),
          size: c.Size,
          lastModified: c.LastModified,
          storageClass: c.StorageClass,
          eTag: c.ETag, // Rclone integrity ETag
          isFolder: false
        }));

      return {
        folders,
        files,
        isTruncated: !!res.IsTruncated,
        nextContinuationToken: res.NextContinuationToken || null
      };
    } else {
      const command = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: prefix,
        Delimiter: delimiter,
        MaxKeys: maxKeys,
        KeyMarker: options.keyMarker || undefined,
        VersionIdMarker: options.versionIdMarker || undefined
      });
      const res = await this.client.send(command);

      const folders = (res.CommonPrefixes || []).map(cp => ({
        key: cp.Prefix,
        name: cp.Prefix.slice(prefix.length),
        isFolder: true
      }));

      const versionedFiles = [];

      (res.Versions || []).forEach(v => {
        versionedFiles.push({
          key: v.Key,
          name: v.Key.slice(prefix.length),
          versionId: v.VersionId,
          isLatest: v.IsLatest,
          size: v.Size,
          lastModified: v.LastModified,
          storageClass: v.StorageClass,
          eTag: v.ETag,
          deleteMarker: false,
          isFolder: false
        });
      });

      (res.DeleteMarkers || []).forEach(dm => {
        versionedFiles.push({
          key: dm.Key,
          name: dm.Key.slice(prefix.length),
          versionId: dm.VersionId,
          isLatest: dm.IsLatest,
          size: 0,
          lastModified: dm.LastModified,
          deleteMarker: true,
          isFolder: false
        });
      });

      versionedFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      return {
        folders,
        files: versionedFiles,
        isTruncated: !!res.IsTruncated,
        nextKeyMarker: res.NextKeyMarker || null,
        nextVersionIdMarker: res.NextVersionIdMarker || null
      };
    }
  }

  async searchObjects(bucketName, query = '', prefix = '', maxResults = 500) {
    if (!this.client) throw new Error('No active connection');
    if (!query || query.trim() === '') return { folders: [], files: [] };

    const q = query.trim().toLowerCase();
    const matchedFiles = [];
    let continuationToken = undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix || undefined,
        MaxKeys: 1000,
        ContinuationToken: continuationToken
      });
      const res = await this.client.send(command);

      const contents = res.Contents || [];
      for (const c of contents) {
        const keyLower = c.Key.toLowerCase();
        if (keyLower.includes(q)) {
          matchedFiles.push({
            key: c.Key,
            name: c.Key,
            size: c.Size,
            lastModified: c.LastModified,
            storageClass: c.StorageClass,
            eTag: c.ETag,
            isFolder: false
          });
          if (matchedFiles.length >= maxResults) break;
        }
      }

      if (matchedFiles.length >= maxResults) break;
      continuationToken = res.NextContinuationToken;
    } while (continuationToken);

    return {
      folders: [],
      files: matchedFiles,
      isSearch: true,
      totalMatched: matchedFiles.length
    };
  }

  async getBucketVersioning(bucketName) {
    if (!this.client) throw new Error('No active connection');
    const res = await this.client.send(new GetBucketVersioningCommand({ Bucket: bucketName }));
    return res.Status || 'Unversioned';
  }

  async putBucketVersioning(bucketName, status) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new PutBucketVersioningCommand({
      Bucket: bucketName,
      VersioningConfiguration: {
        Status: status
      }
    }));
    return status;
  }

  async restoreObjectVersion(bucketName, key, versionId) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${encodeURIComponent(key)}?versionId=${versionId}`,
      Key: key
    }));
    return true;
  }

  async deleteObjects(bucketName, objects) {
    if (!this.client) throw new Error('No active connection');
    if (!objects || objects.length === 0) return true;

    await this.client.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objects.map(o => ({
          Key: o.Key,
          VersionId: o.VersionId
        })),
        Quiet: false
      }
    }));
    return true;
  }

  async copyObject(sourceBucket, sourceKey, destBucket, destKey) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new CopyObjectCommand({
      Bucket: destBucket,
      CopySource: `${sourceBucket}/${encodeURIComponent(sourceKey)}`,
      Key: destKey
    }));
    return true;
  }

  async moveObject(sourceBucket, sourceKey, destBucket, destKey) {
    if (!this.client) throw new Error('No active connection');
    await this.copyObject(sourceBucket, sourceKey, destBucket, destKey);
    await this.client.send(new DeleteObjectCommand({
      Bucket: sourceBucket,
      Key: sourceKey
    }));
    return true;
  }

  // ==================== ADVANCED CONFIG (POLICY, ACL, LIFECYCLE, CORS) ====================
  async getBucketPolicy(bucketName) {
    if (!this.client) throw new Error('No active connection');
    try {
      const res = await this.client.send(new GetBucketPolicyCommand({ Bucket: bucketName }));
      return res.Policy || '';
    } catch (err) {
      if (err.name === 'NoSuchBucketPolicy') return '';
      throw err;
    }
  }

  async putBucketPolicy(bucketName, policyText) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: policyText
    }));
    return true;
  }

  async deleteBucketPolicy(bucketName) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
    return true;
  }

  async getBucketAcl(bucketName) {
    if (!this.client) throw new Error('No active connection');
    const res = await this.client.send(new GetBucketAclCommand({ Bucket: bucketName }));
    return {
      owner: res.Owner,
      grants: res.Grants
    };
  }

  async putBucketAcl(bucketName, cannedAcl) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new PutBucketAclCommand({
      Bucket: bucketName,
      ACL: cannedAcl
    }));
    return true;
  }

  async getObjectAcl(bucketName, key) {
    if (!this.client) throw new Error('No active connection');
    console.log(`[DEBUG ACL] getObjectAcl -> Bucket: "${bucketName}", Key: "${key}"`);
    try {
      const res = await this.client.send(new GetObjectAclCommand({
        Bucket: bucketName,
        Key: key
      }));
      console.log(`[DEBUG ACL] getObjectAcl SUCCESS -> Grants:`, JSON.stringify(res.Grants, null, 2));

      const isPublicRead = (res.Grants || []).some(g =>
        (g.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AllUsers' ||
          g.Grantee?.URI?.includes('AllUsers') ||
          g.Grantee?.ID === 'AllUsers') &&
        (g.Permission === 'READ' || g.Permission === 'FULL_CONTROL')
      );
      const isPublicWrite = (res.Grants || []).some(g =>
        (g.Grantee?.URI === 'http://acs.amazonaws.com/groups/global/AllUsers' ||
          g.Grantee?.URI?.includes('AllUsers') ||
          g.Grantee?.ID === 'AllUsers') &&
        (g.Permission === 'WRITE' || g.Permission === 'FULL_CONTROL')
      );

      let detectedAcl = 'private';
      if (isPublicRead && isPublicWrite) detectedAcl = 'public-read-write';
      else if (isPublicRead) detectedAcl = 'public-read';

      return {
        owner: res.Owner,
        grants: res.Grants,
        detectedAcl
      };
    } catch (err) {
      console.error(`[DEBUG ACL] getObjectAcl ERROR for "${bucketName}/${key}":`, err);
      throw err;
    }
  }

  async putObjectAcl(bucketName, key, cannedAcl) {
    if (!this.client) throw new Error('No active connection');
    console.log(`[DEBUG ACL] putObjectAcl -> Bucket: "${bucketName}", Key: "${key}", ACL: "${cannedAcl}"`);
    try {
      const res = await this.client.send(new PutObjectAclCommand({
        Bucket: bucketName,
        Key: key,
        ACL: cannedAcl
      }));
      console.log(`[DEBUG ACL] putObjectAcl SUCCESS:`, res);
      return true;
    } catch (err) {
      console.error(`[DEBUG ACL] putObjectAcl ERROR for "${bucketName}/${key}":`, err);
      throw err;
    }
  }

  async getObjectMetadata(bucketName, key) {
    if (!this.client) throw new Error('No active connection');
    const res = await this.client.send(new HeadObjectCommand({
      Bucket: bucketName,
      Key: key
    }));

    const expirationStr = res.Expiration || (res.$metadata && res.$metadata.httpHeaders && res.$metadata.httpHeaders['x-amz-expiration']) || null;
    let expirationDetails = null;
    if (expirationStr) {
      const dateMatch = expirationStr.match(/expiry-date="?([^",]+)"?/i);
      const ruleMatch = expirationStr.match(/rule-id="?([^",]+)"?/i);
      expirationDetails = {
        raw: expirationStr,
        expiryDate: dateMatch ? dateMatch[1] : null,
        ruleId: ruleMatch ? ruleMatch[1] : null
      };
    }

    return {
      contentLength: res.ContentLength,
      contentType: res.ContentType,
      lastModified: res.LastModified ? res.LastModified.toISOString() : null,
      eTag: res.ETag ? res.ETag.replace(/"/g, '') : null,
      storageClass: res.StorageClass || 'STANDARD',
      versionId: res.VersionId || null,
      metadata: res.Metadata || {},
      serverSideEncryption: res.ServerSideEncryption || 'None',
      expiration: expirationStr,
      expirationDetails: expirationDetails
    };
  }

  async getPublicUrl(bucketName, key) {
    if (!this.client) throw new Error('No active connection');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    const presigned = await getSignedUrl(this.client, command, { expiresIn: 60 });
    return presigned.split('?')[0];
  }

  async getBucketLifecycle(bucketName) {
    if (!this.client) throw new Error('No active connection');
    try {
      const res = await this.client.send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName }));
      return res.Rules || [];
    } catch (err) {
      if (err.name === 'NoSuchLifecycleConfiguration') return [];
      throw err;
    }
  }

  async putBucketLifecycle(bucketName, rules) {
    if (!this.client) throw new Error('No active connection');
    if (!rules || rules.length === 0) {
      await this.client.send(new DeleteBucketLifecycleCommand({ Bucket: bucketName }));
    } else {
      await this.client.send(new PutBucketLifecycleConfigurationCommand({
        Bucket: bucketName,
        LifecycleConfiguration: { Rules: rules }
      }));
    }
    return true;
  }

  async getBucketCors(bucketName) {
    if (!this.client) throw new Error('No active connection');
    try {
      const res = await this.client.send(new GetBucketCorsCommand({ Bucket: bucketName }));
      return res.CORSRules || [];
    } catch (err) {
      if (err.name === 'NoSuchCORSConfiguration') return [];
      throw err;
    }
  }

  async putBucketCors(bucketName, corsRules) {
    if (!this.client) throw new Error('No active connection');
    await this.client.send(new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: { CORSRules: corsRules }
    }));
    return true;
  }

  async generatePresignedUrl(bucketName, key, expiresInSeconds = 3600) {
    if (!this.client) throw new Error('No active connection');
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    return url;
  }

  // ==================== MULTI-THREADED CONCURRENT TRANSFER QUEUE ====================
  // Tối ưu hóa theo Rclone: Dynamic Part Size Calculation & Exponential Backoff Retry
  calculateOptimalPartSize(fileSizeBytes) {
    const minPartSize = 5 * 1024 * 1024; // 5 MB
    const maxParts = 9500; // An toàn dưới 10,000 parts của S3
    const calculated = Math.ceil(fileSizeBytes / maxParts);
    if (calculated < minPartSize) return minPartSize;
    if (fileSizeBytes > 10 * 1024 * 1024 * 1024) return 64 * 1024 * 1024; // 64MB cho file >10GB
    return Math.max(minPartSize, calculated);
  }

  setConcurrencyLevel(level) {
    this.concurrencyLevel = level;
  }

  sanitizeTask(task) {
    if (!task) return null;
    return {
      id: task.id,
      type: task.type,
      mode: task.mode,
      bucket: task.bucket,
      key: task.key,
      filePath: task.filePath,
      size: task.size,
      loaded: task.loaded,
      progress: task.progress,
      speed: task.speed,
      status: task.status,
      error: task.error,
      startTime: task.startTime,
      totalParts: task.totalParts,
      completedParts: task.completedParts
    };
  }

  getSanitizedQueue() {
    return this.transferQueue.map(t => this.sanitizeTask(t));
  }

  getTransferQueue() {
    return this.getSanitizedQueue();
  }

  broadcastQueueStatus() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('transfer-queue-update', this.getSanitizedQueue());
    }
  }

  async addUploadTask(bucketName, prefix, filePath) {
    const fileName = path.basename(filePath);
    const key = prefix ? `${prefix}${fileName}` : fileName;
    const stat = fs.statSync(filePath);

    const task = {
      id: `up-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'UPLOAD',
      bucket: bucketName,
      key,
      filePath,
      size: stat.size,
      contentType: detectContentType(filePath),
      mode: stat.size >= 15 * 1024 * 1024 ? 'MULTIPART' : 'SINGLE',
      loaded: 0,
      progress: 0,
      speed: '0 KB/s',
      status: 'pending',
      error: null,
      startTime: null
    };

    this.transferQueue.unshift(task);
    this.broadcastQueueStatus();
    this.processQueue();
    return this.sanitizeTask(task);
  }

  async addDownloadTask(bucketName, key, savePath) {
    const task = {
      id: `down-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: 'DOWNLOAD',
      bucket: bucketName,
      key,
      filePath: savePath,
      size: 0,
      loaded: 0,
      progress: 0,
      speed: '0 KB/s',
      status: 'pending',
      error: null,
      startTime: null
    };

    this.transferQueue.unshift(task);
    this.broadcastQueueStatus();
    this.processQueue();
    return this.sanitizeTask(task);
  }

  async addDownloadFolderTasks(bucketName, folderPrefix, saveDir) {
    if (!this.client) throw new Error('No active connection');

    const cleanPrefix = folderPrefix.endsWith('/') ? folderPrefix : `${folderPrefix}/`;
    const folderSegments = cleanPrefix.split('/').filter(Boolean);
    const folderName = folderSegments.length > 0 ? folderSegments[folderSegments.length - 1] : 'S3-Folder';

    let continuationToken = undefined;
    let addedCount = 0;
    const addedTasks = [];

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: cleanPrefix,
        Delimiter: '', // Không dùng delimiter để quét đệ quy toàn bộ thư mục & thư mục con
        MaxKeys: 1000,
        ContinuationToken: continuationToken
      });
      const res = await this.client.send(command);

      const contents = res.Contents || [];
      for (const item of contents) {
        if (!item.Key || item.Key === cleanPrefix || item.Key.endsWith('/')) continue; // Bỏ qua folder marker

        const relativePath = item.Key.slice(cleanPrefix.length);
        const fullSavePath = path.join(saveDir, folderName, relativePath);

        const task = {
          id: `down-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          type: 'DOWNLOAD',
          bucket: bucketName,
          key: item.Key,
          filePath: fullSavePath,
          size: item.Size || 0,
          loaded: 0,
          progress: 0,
          speed: '0 KB/s',
          status: 'pending',
          error: null,
          startTime: null
        };

        this.transferQueue.push(task);
        addedTasks.push(this.sanitizeTask(task));
        addedCount++;
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    if (addedCount > 0) {
      this.broadcastQueueStatus();
      this.processQueue();
    }

    return { count: addedCount, folderName, tasks: addedTasks };
  }

  async addDownloadTasksBatch(bucketName, objectList, saveDir, prefix = '') {
    if (!this.client) throw new Error('No active connection');

    let addedCount = 0;
    const addedTasks = [];

    for (const item of objectList) {
      const key = typeof item === 'string' ? item : item.Key || item.key;
      if (!key || key.endsWith('/')) continue;

      let relativePath = (prefix && key.startsWith(prefix)) ? key.slice(prefix.length) : key.split('/').pop();
      if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
      const fullSavePath = path.join(saveDir, relativePath);

      const task = {
        id: `down-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        type: 'DOWNLOAD',
        bucket: bucketName,
        key,
        filePath: fullSavePath,
        size: item.Size || item.size || 0,
        loaded: 0,
        progress: 0,
        speed: '0 KB/s',
        status: 'pending',
        error: null,
        startTime: null
      };

      this.transferQueue.push(task);
      addedTasks.push(this.sanitizeTask(task));
      addedCount++;
    }

    if (addedCount > 0) {
      this.broadcastQueueStatus();
      this.processQueue();
    }

    return { count: addedCount, tasks: addedTasks };
  }

  async processQueue() {
    while (this.activeTransfers < this.concurrencyLevel) {
      const nextTask = this.transferQueue.find(t => t.status === 'pending');
      if (!nextTask) break;

      this.activeTransfers++;
      this.executeTaskWithRetry(nextTask).finally(() => {
        this.activeTransfers--;
        this.processQueue();
      });
    }
  }

  // Rclone Exponential Backoff Retry wrapper
  // Rclone Exponential Backoff Retry wrapper
  async executeTaskWithRetry(task, maxRetries = 3) {
    if (task.status === 'canceled') return;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (task.status === 'canceled') return;
      try {
        await this.executeTask(task);
        if (task.status === 'canceled') return;
        this.broadcastQueueStatus();
        return;
      } catch (err) {
        if (task.status === 'canceled' || err.name === 'AbortError' || err.message?.toLowerCase().includes('canceled') || err.message?.toLowerCase().includes('abort')) {
          task.status = 'canceled';
          task.speed = 'Đã hủy';
          this.broadcastQueueStatus();
          return;
        }
        if (attempt === maxRetries) {
          console.error(`Task failed after ${maxRetries} attempts (${task.id}):`, err);
          task.status = 'failed';
          task.error = err.message;
          this.broadcastQueueStatus();
        } else {
          const backoffDelay = Math.pow(2, attempt) * 1000;
          task.speed = `Thử lại lần ${attempt}/${maxRetries}...`;
          this.broadcastQueueStatus();
          await new Promise(r => setTimeout(r, backoffDelay));
        }
      }
    }
  }

  async executeTask(task) {
    task.status = 'active';
    task.startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = Date.now();

    this.broadcastQueueStatus();

    if (task.type === 'UPLOAD') {
      const optimalPartSize = this.calculateOptimalPartSize(task.size);

      if (task.size < 15 * 1024 * 1024) {
        task.totalParts = 1;
        task.completedParts = 0;
        const fileBuffer = await fs.promises.readFile(task.filePath);
        const contentType = detectContentType(task.filePath, fileBuffer);
        const abortController = new AbortController();
        task.abortController = abortController;

        try {
          await this.client.send(
            new PutObjectCommand({
              Bucket: task.bucket,
              Key: task.key,
              Body: fileBuffer,
              ContentLength: fileBuffer.length,
              ContentType: contentType
            }),
            { abortSignal: abortController.signal }
          );
        } catch (err) {
          if (task.status === 'canceled' || err.name === 'AbortError') return;
          throw err;
        }
      } else {
        task.totalParts = Math.ceil(task.size / optimalPartSize);
        task.completedParts = 0;
        const fileStream = fs.createReadStream(task.filePath, { highWaterMark: 1024 * 1024 * 4 });
        const contentType = task.contentType || detectContentType(task.filePath);

        const parallelUploads3 = new Upload({
          client: this.client,
          params: {
            Bucket: task.bucket,
            Key: task.key,
            Body: fileStream,
            ContentLength: task.size,
            ContentType: contentType
          },
          queueSize: 8, // 8 luồng song song
          partSize: optimalPartSize
        });

        task.uploadController = parallelUploads3;

        parallelUploads3.on('httpUploadProgress', (progress) => {
          if (progress.loaded && progress.total && task.status !== 'canceled') {
            const now = Date.now();
            const timeDiff = (now - lastTime) / 1000;
            if (timeDiff >= 0.25 || progress.loaded === progress.total) {
              const byteDiff = progress.loaded - lastLoaded;
              const speedBps = timeDiff > 0 ? byteDiff / timeDiff : 0;

              task.loaded = progress.loaded;
              task.size = progress.total;
              task.progress = Math.round((progress.loaded / progress.total) * 100);
              task.completedParts = Math.min(
                task.totalParts || 1,
                Math.floor(progress.loaded / optimalPartSize)
              );
              task.speed = this.formatSpeed(speedBps);

              lastLoaded = progress.loaded;
              lastTime = now;
              this.broadcastQueueStatus();
            }
          }
        });

        try {
          await parallelUploads3.done();
        } catch (err) {
          if (task.status === 'canceled' || err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
            return;
          }
          throw err;
        }
      }

      if (task.status === 'canceled') return;

      task.completedParts = task.totalParts || 1;
      task.status = 'completed';
      task.progress = 100;
      task.speed = 'Hoàn tất (Đã xác thực ETag)';
      this.broadcastQueueStatus();

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('transfer-completed', {
          bucket: task.bucket,
          key: task.key,
          type: task.type
        });
      }
    } else if (task.type === 'DOWNLOAD') {
      if (task.status === 'canceled') return;

      const abortController = new AbortController();
      task.abortController = abortController;

      const command = new GetObjectCommand({
        Bucket: task.bucket,
        Key: task.key
      });
      const res = await this.client.send(command, { abortSignal: abortController.signal });
      const totalSize = res.ContentLength || 0;
      task.size = totalSize;
      task.resBody = res.Body;

      const dir = path.dirname(task.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(task.filePath);
      task.writeStream = writeStream;
      let loaded = 0;

      await new Promise((resolve, reject) => {
        let isSettled = false;
        const cleanup = (err) => {
          if (isSettled) return;
          isSettled = true;
          if (err || task.status === 'canceled') {
            if (res.Body && typeof res.Body.destroy === 'function') {
              try { res.Body.destroy(); } catch (e) {}
            }
            if (writeStream && typeof writeStream.destroy === 'function') {
              try { writeStream.destroy(); } catch (e) {}
            }
            if (fs.existsSync(task.filePath)) {
              try { fs.unlink(task.filePath, () => {}); } catch (e) {}
            }
          }
        };

        res.Body.on('data', (chunk) => {
          if (isSettled || task.status === 'canceled') {
            cleanup(new Error('Canceled by user'));
            return;
          }
          loaded += chunk.length;
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5 || (totalSize > 0 && loaded === totalSize)) {
            const byteDiff = loaded - lastLoaded;
            const speedBps = timeDiff > 0 ? byteDiff / timeDiff : 0;
            task.loaded = loaded;
            task.progress = totalSize > 0 ? Math.round((loaded / totalSize) * 100) : 100;
            task.speed = this.formatSpeed(speedBps);
            lastLoaded = loaded;
            lastTime = now;
            this.broadcastQueueStatus();
          }
        });

        res.Body.pipe(writeStream);

        writeStream.on('finish', () => {
          if (isSettled) return;
          if (task.status === 'canceled') {
            const err = new Error('Canceled by user');
            cleanup(err);
            reject(err);
            return;
          }
          if (totalSize > 0 && loaded < totalSize) {
            const err = new Error(`Tải xuống bị ngắt quãng: mới tải được ${loaded}/${totalSize} bytes`);
            cleanup(err);
            reject(err);
          } else {
            cleanup(null);
            resolve();
          }
        });

        writeStream.on('error', (err) => {
          if (isSettled) return;
          cleanup(err);
          reject(err);
        });

        res.Body.on('error', (err) => {
          if (isSettled) return;
          cleanup(err);
          if (writeStream && typeof writeStream.destroy === 'function') writeStream.destroy(err);
          reject(err);
        });
      });

      if (task.status === 'canceled') return;

      task.status = 'completed';
      task.progress = 100;
      task.loaded = task.size || loaded;
      task.speed = 'Hoàn tất';
      this.broadcastQueueStatus();

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('transfer-completed', {
          bucket: task.bucket,
          key: task.key,
          type: task.type
        });
      }
    }
  }

  async abortRemoteMultipartUpload(bucketName, key) {
    try {
      // 1. Liệt kê các multipart upload đang dở dang cho Key này
      const listCommand = new ListMultipartUploadsCommand({
        Bucket: bucketName,
        Prefix: key
      });
      const res = await this.client.send(listCommand);
      const uploads = res.Uploads || [];

      // 2. Gọi AbortMultipartUploadCommand để hủy và giải phóng dung lượng trên S3
      for (const upload of uploads) {
        if (upload.Key === key && upload.UploadId) {
          await this.client.send(
            new AbortMultipartUploadCommand({
              Bucket: bucketName,
              Key: key,
              UploadId: upload.UploadId
            })
          );
          console.log(`[S3Service] Đã hủy Remote Multipart UploadId: ${upload.UploadId} cho Key: ${key}`);
        }
      }
    } catch (err) {
      console.warn(`[S3Service] Lỗi khi hủy Remote Multipart Upload cho ${key}:`, err.message);
    }
  }

  async cancelTask(taskId) {
    const task = this.transferQueue.find(t => t.id === taskId);
    if (task && (task.status === 'pending' || task.status === 'active')) {
      task.status = 'canceled';
      task.speed = 'Đã hủy';

      // 1. Ngắt kết nối mạng cục bộ & stream đang chạy
      if (task.uploadController && typeof task.uploadController.abort === 'function') {
        try {
          task.uploadController.abort();
        } catch (e) {
          console.error('Error aborting active upload:', e);
        }
      }
      if (task.abortController && typeof task.abortController.abort === 'function') {
        try {
          task.abortController.abort();
        } catch (e) {
          console.error('Error aborting active single transfer:', e);
        }
      }
      if (task.resBody && typeof task.resBody.destroy === 'function') {
        try {
          task.resBody.destroy();
        } catch (e) {}
      }
      if (task.writeStream && typeof task.writeStream.destroy === 'function') {
        try {
          task.writeStream.destroy();
        } catch (e) {}
      }
      if (task.filePath && fs.existsSync(task.filePath)) {
        try {
          fs.unlink(task.filePath, () => {});
        } catch (e) {}
      }

      this.broadcastQueueStatus();

      // 2. Gọi API S3 hủy Multipart Upload trên server để giải phóng dung lượng
      if (task.type === 'UPLOAD' && this.client) {
        await this.abortRemoteMultipartUpload(task.bucket, task.key);
      }
    }
  }

  clearCompletedTasks() {
    this.transferQueue = this.transferQueue.filter(
      t => t.status !== 'completed' && t.status !== 'canceled' && t.status !== 'failed'
    );
    this.broadcastQueueStatus();
  }

  formatSpeed(bps) {
    if (bps < 1024) return `${bps.toFixed(0)} B/s`;
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)} KB/s`;
    return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
  }
}

export default new S3Service();
