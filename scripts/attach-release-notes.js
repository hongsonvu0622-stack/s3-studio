import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function attachReleaseNotes() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('⚠️ [Release Notes] Không tìm thấy GH_TOKEN/GITHUB_TOKEN. Bỏ qua gán Release Notes.');
    return;
  }

  try {
    const pkgPath = path.join(rootDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const version = pkg.version;
    const tag = `v${version}`;

    const publishConfig = pkg.build?.publish?.[0] || {};
    const owner = publishConfig.owner || 'hongsonvu0622-stack';
    const repo = publishConfig.repo || 's3-studio';

    // Tìm file release notes (ưu tiên theo version, hoặc file chung RELEASE_NOTES.md)
    let notesPath = path.join(rootDir, 'docs', `RELEASE_NOTES_v${version}.md`);
    if (!fs.existsSync(notesPath)) {
      notesPath = path.join(rootDir, 'docs', 'RELEASE_NOTES.md');
    }

    if (!fs.existsSync(notesPath)) {
      console.warn(`⚠️ [Release Notes] Không tìm thấy file release notes tại docs/RELEASE_NOTES.md. Bỏ qua.`);
      return;
    }

    const notesContent = fs.readFileSync(notesPath, 'utf-8');
    console.log(`📡 [Release Notes] Đang gán Release Notes từ ${path.relative(rootDir, notesPath)} cho release tag ${tag} (${owner}/${repo})...`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'S3-Studio-Release-Script'
    };

    // 1. Lấy thông tin release theo tag từ GitHub API
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
      method: 'GET',
      headers
    });

    if (!getRes.ok) {
      if (getRes.status === 404) {
        console.error(`❌ [Release Notes] Không tìm thấy release tag ${tag} trên GitHub (${owner}/${repo}). Hãy đảm bảo release đã được tạo trước.`);
      } else {
        const errText = await getRes.text();
        console.error(`❌ [Release Notes] Lỗi khi tra cứu release tag ${tag} (${getRes.status}):`, errText);
      }
      return;
    }

    const releaseData = await getRes.json();
    const releaseId = releaseData.id;

    // 2. Cập nhật body (Release notes) cho release ID
    const patchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}`, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: notesContent
      })
    });

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      console.error(`❌ [Release Notes] Lỗi khi cập nhật nội dung Release Notes (${patchRes.status}):`, errText);
      return;
    }

    const updatedRelease = await patchRes.json();
    console.log(`✅ [Release Notes] Đã gán thành công Release Notes cho phiên bản ${tag}!`);
    console.log(`🔗 URL: ${updatedRelease.html_url}`);
  } catch (err) {
    console.error('❌ [Release Notes] Lỗi ngoại lệ khi gán Release Notes:', err.message);
  }
}

attachReleaseNotes();
