import { spawn } from 'child_process';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  Starting KnoTrail Full-Stack Local Development Environment  ');
console.log('\x1b[36m%s\x1b[0m', '  Frontend: http://localhost:3000                             ');
console.log('\x1b[36m%s\x1b[0m', '  Backend:  http://localhost:4000                             ');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

// 1. Spawn Backend Process
const backend = spawn(
  'node',
  ['--env-file-if-exists=.env.local', '--watch', '--experimental-strip-types', 'backend/server.ts'],
  { stdio: 'inherit', env: { ...process.env, PORT: '4000' } }
);

// 2. Spawn Frontend Process
const frontend = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  env: process.env,
});

function cleanup() {
  console.log('\n[KnoTrail Dev] Shutting down full-stack processes...');
  try {
    backend.kill('SIGTERM');
  } catch {}
  try {
    frontend.kill('SIGTERM');
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

backend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[KnoTrail Dev] Backend exited with error code ${code}`);
  }
});

frontend.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[KnoTrail Dev] Frontend exited with error code ${code}`);
  }
});
