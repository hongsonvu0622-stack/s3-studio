import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
const version = pkg.version;

let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const envPath = path.join(__dirname, '../.env');
if (!token && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const match = envContent.match(/GH_TOKEN=(.*)/) || envContent.match(/GITHUB_TOKEN=(.*)/);
  if (match && match[1]) {
    token = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

async function cleanRemoteAssets() {
  if (!token) {
    console.log('💡 [Clean Remote] Không tìm thấy token, bỏ qua dọn dẹp remote.');
    return;
  }
  const owner = 'hongsonvu0622-stack';
  const repo = 's3-studio';
  const tags = [`v${version}`, version];

  for (const tag of tags) {
    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'S3-Studio-Builder'
        }
      });
      if (res.status === 200) {
        const release = await res.json();
        if (release && release.assets && release.assets.length > 0) {
          console.log(`🧹 [Clean GitHub Release] Phát hiện Release "${tag}" có ${release.assets.length} tệp đính kèm cũ. Đang xóa để chuẩn bị tải lên bản mới...`);
          for (const asset of release.assets) {
            console.log(`   - Đang xóa tệp cũ trên GitHub: ${asset.name} (ID: ${asset.id})...`);
            await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'S3-Studio-Builder'
              }
            });
          }
          console.log(`✅ [Clean GitHub Release] Đã xóa sạch tệp cũ trên Release "${tag}"!`);
        } else {
          console.log(`✨ [Clean GitHub Release] Release "${tag}" trên GitHub chưa có tệp đính kèm nào.`);
        }
        break;
      }
    } catch (err) {
      console.warn(`⚠️ [Clean GitHub Release] Lỗi kiểm tra/xóa assets của tag ${tag}:`, err.message);
    }
  }
}

cleanRemoteAssets();
