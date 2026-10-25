import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('out', { recursive: true });
const result = spawnSync(process.execPath, ['node_modules/videowright/dist/cli/bin.js', 'render', 'intro', '--fps', '30', '--output', 'out/intro.mp4'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
