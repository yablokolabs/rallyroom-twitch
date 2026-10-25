// This separate path cannot certify or overwrite the genuine-Twitch assembly gate.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
const run = (bin, args) => {
  const r = spawnSync(bin, args, { encoding: 'utf8', maxBuffer: 8e6 });
  if (r.status !== 0) throw new Error(`${bin}: ${r.stderr?.slice(-1200)}`);
  return r.stdout;
};
const edit = JSON.parse(readFileSync('videos/demo/local-review-edit.json', 'utf8'));
assert.equal(edit.kind, 'local simulation review, not a live Twitch demo');
assert(Math.abs(edit.clips.reduce((n, c) => n+c.duration, 0)-edit.duration) < 0.01);
assert(edit.duration <= 180);
mkdirSync('out/local-review-clips', { recursive: true });
run('python3', ['scripts/captions.py']);
for (const [i, c] of edit.clips.entries()) {
  assert(existsSync(c.file), `Missing reviewed input: ${c.file}`);
  assert(c.start >= 0 && c.duration > 0);
  if (!c.still) {
    const source = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', c.file]));
    assert(c.take > 0 && c.start+c.take <= Number(source.format.duration)+0.01, `Clip exceeds source: ${c.file}`);
  }
  const input = c.still ? ['-loop', '1', '-i', c.file] : ['-ss', String(c.start), '-i', c.file];
  let vf = c.still ? '' : `trim=duration=${c.take},setpts=${c.duration/c.take}*(PTS-STARTPTS),`;
  vf += 'scale=1920:960:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:0:color=0x101d32,setsar=1,fps=30';
  if (c.label) {
    // Authored labels are fixed source literals, never chat or manifest user input.
    assert(/^[A-Z0-9 .·×/]+$/.test(c.label));
    vf += `,drawtext=text='${c.label}':fontcolor=white:fontsize=30:x=28:y=10:box=1:boxcolor=0x101d32@0.95:boxborderw=10`;
  }
  run('ffmpeg', ['-y', '-v', 'error', ...input, '-t', String(c.duration), '-an', '-vf', vf,
    '-c:v', 'libx264', '-preset', 'veryfast', '-threads', '2', '-crf', '20', '-pix_fmt', 'yuv420p', `out/local-review-clips/${i}.mp4`]);
  console.log(`Reviewed local segment ${i+1}/${edit.clips.length}`);
}
writeFileSync('out/local-review-concat.txt', edit.clips.map((_, i) => `file 'local-review-clips/${i}.mp4'`).join('\n'));
run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'out/local-review-concat.txt',
  '-i', 'media/voice/narration.wav', '-vf', "subtitles=out/narration.srt:force_style='FontName=DejaVu Sans,FontSize=12,Outline=1,Shadow=0,Alignment=2,MarginV=9'",
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7,apad', '-t', String(edit.duration), '-c:v', 'libx264', '-preset', 'veryfast', '-threads', '2', '-crf', '20',
  '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out/rallyroom-local-review.mp4']);
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,width,height', '-of', 'json', 'out/rallyroom-local-review.mp4']));
assert(Number(probe.format.duration) <= 180);
assert(probe.streams.some(s => s.codec_name === 'aac'));
assert(probe.streams.some(s => s.width === 1920 && s.height === 1080));
writeFileSync('out/local-review-receipt.json', JSON.stringify({ ...probe, evidence:edit.kind, voice:'Kokoro bf_emma, en-gb, youthful adult delivery direction', uploaded:false }, null, 2));
console.log(`Local review ready: ${resolve('out/rallyroom-local-review.mp4')}`);
