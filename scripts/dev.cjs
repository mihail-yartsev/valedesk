#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');

const isWindows = process.platform === 'win32';

if (!isWindows) {
  spawnSync('npm', ['run', 'dev:clean'], { stdio: 'inherit', shell: true });
}

const electronCommand = isWindows ? 'npm run dev:electron:delayed' : 'npm run dev:electron';

const args = [
  '-k',
  '--kill-others-on-fail',
  '-n',
  'react,electron',
  '-c',
  'cyan,magenta',
  'npm run dev:react',
  electronCommand
];

const proc = spawn('concurrently', args, { stdio: 'inherit', shell: true });

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => {
    proc.kill(signal);
  });
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
