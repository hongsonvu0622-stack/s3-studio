import './suppress-warnings.js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { app } from 'electron';

const UPDATE_TEMP_DIR = path.join(os.tmpdir(), 's3studio-updates');
const GITHUB_REPO = 'hongsonvu0622-stack/s3-studio';

function parseVersion(v) {
  return (v || '').replace(/^v/i, '').trim();
}

function compareVersions(v1, v2) {
  const parts1 = parseVersion(v1).split('.').map(Number);
  const parts2 = parseVersion(v2).split('.').map(Number);
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function getBestAssetForPlatform(assets = []) {
  const platform = process.platform;
  const arch = process.arch; // 'arm64' or 'x64'

  const filteredAssets = assets.filter(a =>
    !a.name.endsWith('.blockmap') &&
    !a.name.endsWith('.yml') &&
    !a.name.endsWith('.yaml')
  );

  if (platform === 'darwin') {
    // Ưu tiên file zip trước vì ditto -x -k giải nén vào /Applications siêu nhanh, an toàn hơn hdiutil mount
    let matched = filteredAssets.find(a => a.name.includes(arch) && a.name.endsWith('.zip'));
    if (!matched) matched = filteredAssets.find(a => a.name.includes(arch) && a.name.endsWith('.dmg'));
    if (!matched) matched = filteredAssets.find(a => a.name.endsWith('.zip'));
    if (!matched) matched = filteredAssets.find(a => a.name.endsWith('.dmg'));
    return matched;
  } else if (platform === 'win32') {
    // Ưu tiên Setup.exe
    let matched = filteredAssets.find(a => a.name.toLowerCase().includes('setup') && a.name.endsWith('.exe'));
    if (!matched) matched = filteredAssets.find(a => a.name.endsWith('.exe'));
    return matched;
  } else {
    return filteredAssets[0];
  }
}

function checkLatestRelease() {
  return new Promise((resolve) => {
    try {
      const currentVer = app.getVersion();
      const options = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_REPO}/releases/latest`,
        headers: {
          'User-Agent': 'S3Studio-Updater/1.0'
        },
        timeout: 5000
      };

      const req = https.get(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const release = JSON.parse(data);
              const latestVersion = parseVersion(release.tag_name);
              const hasUpdate = compareVersions(latestVersion, currentVer) > 0;
              const bestAsset = getBestAssetForPlatform(release.assets || []);

              resolve({
                status: hasUpdate ? 'update-available' : 'up-to-date',
                currentVersion: currentVer,
                latestVersion: latestVersion || currentVer,
                releaseNotes: release.body || 'Không có ghi chú phát hành.',
                releaseName: release.name || `S3 Studio v${latestVersion}`,
                publishedAt: release.published_at || null,
                downloadUrl: bestAsset ? bestAsset.browser_download_url : release.html_url,
                fileName: bestAsset ? bestAsset.name : null,
                sizeBytes: bestAsset ? bestAsset.size : 0
              });
            } catch (err) {
              resolve({
                status: 'error',
                currentVersion: currentVer,
                latestVersion: currentVer,
                message: 'Lỗi phân tích thông tin phiên bản từ GitHub.'
              });
            }
          } else {
            resolve({
              status: 'up-to-date',
              currentVersion: currentVer,
              latestVersion: currentVer,
              message: `Chưa có bản phát hành mới (Mã HTTP: ${res.statusCode})`
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 'error',
          currentVersion: app.getVersion(),
          latestVersion: app.getVersion(),
          message: 'Kiểm tra cập nhật hết thời gian phản hồi.'
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 'error',
          currentVersion: app.getVersion(),
          latestVersion: app.getVersion(),
          message: 'Không thể kết nối GitHub: ' + err.message
        });
      });
    } catch (err) {
      resolve({
        status: 'error',
        currentVersion: app.getVersion(),
        latestVersion: app.getVersion(),
        message: 'Lỗi kiểm tra cập nhật: ' + err.message
      });
    }
  });
}

function cleanupOldPackages() {
  try {
    if (fs.existsSync(UPDATE_TEMP_DIR)) {
      const files = fs.readdirSync(UPDATE_TEMP_DIR);
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(UPDATE_TEMP_DIR, file));
        } catch (e) {}
      });
    } else {
      fs.mkdirSync(UPDATE_TEMP_DIR, { recursive: true });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function downloadUpdateInBackground(downloadUrl, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    cleanupOldPackages(); // Dọn sạch tệp lỗi/dở dang cũ trước khi tải tệp mới

    if (!fs.existsSync(UPDATE_TEMP_DIR)) {
      fs.mkdirSync(UPDATE_TEMP_DIR, { recursive: true });
    }

    const targetPath = path.join(UPDATE_TEMP_DIR, fileName || 'S3Studio-update.dmg');

    const downloadFile = (url) => {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers: { 'User-Agent': 'S3Studio-Updater/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadFile(res.headers.location);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Tải xuống thất bại với HTTP ${res.statusCode}`));
        }

        const totalBytes = parseInt(res.headers['content-length'], 10) || 0;
        let downloadedBytes = 0;
        const fileStream = fs.createWriteStream(targetPath);

        res.on('data', chunk => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && onProgress) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            onProgress({ percent, downloadedBytes, totalBytes });
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            if (totalBytes > 0 && downloadedBytes < totalBytes) {
              try { fs.unlinkSync(targetPath); } catch (e) {}
              return reject(new Error(`Tải xuống bị ngắt quãng (chỉ tải được ${downloadedBytes}/${totalBytes} bytes). Vui lòng kiểm tra mạng và thử lại.`));
            }
            resolve({ success: true, filePath: targetPath, fileName });
          });
        });

        fileStream.on('error', err => {
          fs.unlink(targetPath, () => {});
          reject(err);
        });
      }).on('error', reject);
    };

    downloadFile(downloadUrl);
  });
}

function installUpdateAndCleanup(fileName) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(UPDATE_TEMP_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return reject(new Error('Tệp cập nhật không tồn tại hoặc đã bị xóa.'));
    }

    try {
      const stats = fs.statSync(filePath);
      if (stats.size < 100000) { // < 100KB là file lỗi hoặc HTML response
        fs.unlinkSync(filePath);
        return reject(new Error('Tệp cập nhật bị lỗi hoặc tải không đầy đủ (<100KB). Hệ thống đã tự xóa tệp lỗi, vui lòng tải lại.'));
      }
    } catch (e) {}

    const platform = process.platform;
    let cmd = `open "${filePath}"`;
    if (platform === 'darwin') {
      if (fileName.endsWith('.zip')) {
        cmd = `ditto -x -k "${filePath}" /Applications && rm -f "${filePath}"`;
      } else if (fileName.endsWith('.dmg')) {
        cmd = `MOUNT_OUT=$(hdiutil attach "${filePath}" -nobrowse) && VOL_PATH=$(echo "$MOUNT_OUT" | grep -o '/Volumes/.*' | head -n 1) && if [ -n "$VOL_PATH" ]; then APP_PATH=$(find "$VOL_PATH" -maxdepth 1 -name "*.app" | head -n 1); if [ -n "$APP_PATH" ]; then cp -R "$APP_PATH" /Applications/; fi; hdiutil detach "$VOL_PATH" -quiet; fi && rm -f "${filePath}"`;
      }
    } else if (platform === 'win32') {
      cmd = `start "" "${filePath}"`;
    } else if (platform === 'linux') {
      cmd = `chmod +x "${filePath}" && "${filePath}" &`;
    }

    exec(cmd, (err) => {
      if (err) {
        try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) {}
        return reject(new Error(`Lỗi cài đặt (${fileName}): ` + err.message));
      }

      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {}
      }, 90000);

      resolve({ success: true });
    });
  });
}

export default {
  checkLatestRelease,
  cleanupOldPackages,
  downloadUpdateInBackground,
  installUpdateAndCleanup
};
