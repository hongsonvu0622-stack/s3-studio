import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const pkgPath = path.join(rootDir, 'package.json');

function syncVersion() {
  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  let appVersion = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...valParts] = trimmed.split('=');
    const value = valParts.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (key.trim() === 'APP_VERSION' && value) {
      appVersion = value;
      break;
    }
  }

  if (!appVersion) return;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (pkg.version !== appVersion) {
      console.log(`📌 [Sync Version] Cập nhật phiên bản từ .env: v${pkg.version} -> v${appVersion}`);
      execSync(`npm --no-git-tag-version version ${appVersion}`, { cwd: rootDir, stdio: 'ignore' });
      console.log(`✅ [Sync Version] Đã đồng bộ package.json & package-lock.json thành v${appVersion}!`);
    }
  } catch (err) {
    console.error('⚠️ [Sync Version] Lỗi khi đồng bộ version:', err.message);
  }
}

syncVersion();
