import './sync-version.js';
import { spawn } from 'child_process';
import http from 'http';

console.log('🚀 [S3 Studio] Khởi động Vite dev server...');

const viteProcess = spawn('npx', ['vite', '--port', '5173', '--host', '127.0.0.1'], {
  stdio: 'inherit',
  shell: true
});

function checkViteReady(url, maxRetries = 40, delayMs = 250) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      attempts++;
      const req = http.get(url, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        if (attempts >= maxRetries) {
          reject(new Error('Vite server timed out'));
        } else {
          setTimeout(tryConnect, delayMs);
        }
      });
      req.end();
    };
    tryConnect();
  });
}

checkViteReady('http://127.0.0.1:5173')
  .then(() => {
    console.log('✅ [S3 Studio] Vite đã sẵn sàng! Khởi động Electron...');
    const electronProcess = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173',
        AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE: '1'
      }
    });

    electronProcess.on('close', (code) => {
      console.log('🛑 [S3 Studio] Electron đã đóng. Dừng Vite dev server...');
      viteProcess.kill();
      process.exit(code || 0);
    });
  })
  .catch((err) => {
    console.error('❌ Lỗi khởi động Vite:', err.message);
    viteProcess.kill();
    process.exit(1);
  });

process.on('SIGINT', () => {
  viteProcess.kill();
  process.exit();
});
process.on('SIGTERM', () => {
  viteProcess.kill();
  process.exit();
});
