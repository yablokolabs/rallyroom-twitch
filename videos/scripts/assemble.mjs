import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
function run(bin,args){const result=spawnSync(bin,args,{stdio:['ignore','pipe','pipe'],encoding:'utf8'});if(result.status!==0)throw new Error(`${bin} failed; inspect local source media and rerun.`);return result.stdout;}
const manifestPath=resolve('media/manifest.json');
if(!existsSync(manifestPath))throw new Error('Genuine footage pending: put the reviewed manifest in videos/media/manifest.json. See docs/DEMO.md. No final demo generated.');
const manifest=JSON.parse(readFileSync(manifestPath,'utf8'));
if(!manifest.consentingChannelCapture||!manifest.codexSessionVerified||!manifest.privateDataReviewed)throw new Error('Confirm consent, actual Codex session evidence and private-data review in the local manifest before assembly.');
if(!Array.isArray(manifest.clips)||manifest.clips.length<2||manifest.clips.length>12)throw new Error('Provide 2–12 reviewed clips.');
const media=resolve('media'),out=resolve('out');mkdirSync(out,{recursive:true});
if(!existsSync(resolve(out,'intro.mp4')))throw new Error('Run npm run render:intro first.');
const files=[resolve(out,'intro.mp4')];let total=8;
for(const[i,clip]of manifest.clips.entries()){
  if(!/^[a-zA-Z0-9_-]+\.(mp4|mkv|mov|webm)$/.test(clip.file)||!Number.isFinite(clip.start)||clip.start<0||!Number.isFinite(clip.duration)||clip.duration<=0)throw new Error('Invalid clip specification.');
  const input=resolve(media,clip.file);if(!input.startsWith(media+sep)||!existsSync(input))throw new Error(`Missing source clip ${clip.file}`);
  const probe=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',input]));
  if(clip.start+clip.duration>Number(probe.format.duration)+0.05)throw new Error(`Clip range exceeds source duration: ${clip.file}`);
  total+=clip.duration;if(total>180)throw new Error('Demo exceeds three-minute limit.');
  const target=resolve(out,`clip-${i}.mp4`);
  run('ffmpeg',['-y','-v','error','-ss',String(clip.start),'-i',input,'-t',String(clip.duration),'-an','-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30','-c:v','libx264','-pix_fmt','yuv420p',target]);files.push(target);
}
// Only generated safe filenames appear in this concat file.
writeFileSync(resolve(out,'concat.txt'),files.map(file=>`file '${file.replaceAll("'","'\\''")}'`).join('\n'));
run('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i',resolve(out,'concat.txt'),'-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',resolve(out,'rallyroom-review.mp4')]);
const result=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',resolve(out,'rallyroom-review.mp4')]));
if(Number(result.format.duration)>180)throw new Error('Rendered duration exceeds limit.');
console.log(`Local review export: out/rallyroom-review.mp4 (${result.format.duration}s). No upload performed. Videowright authored/rendered the opening; FFmpeg trimmed and assembled the genuine recordings. Audio is omitted in this captions-only path.`);
