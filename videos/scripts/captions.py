"""Correct local ASR names and group its measured word timings into subtitles."""
import json
import re
import textwrap
from pathlib import Path

root = Path(__file__).resolve().parents[1]
words = json.loads((root / 'media/voice/word-timing.json').read_text())['words']
corrections = {
    'rally room': 'RallyRoom', 'open ai codecs': 'OpenAI Codex',
    'later rival': 'late arrival', 'duplicator vent id': 'duplicate event IDs',
}
clean = []
i = 0
while i < len(words):
    for old, new in corrections.items():
        n = len(old.split())
        phrase = ' '.join(re.sub(r'[^a-z]', '', w['word'].lower()) for w in words[i:i+n])
        if phrase == old:
            clean.append(dict(word=new + ('.' if words[i+n-1]['word'].endswith('.') else ''),
                              start=words[i]['start'], end=words[i+n-1]['end']))
            i += n
            break
    else:
        clean.append(words[i])
        i += 1

def stamp(seconds):
    ms = round(seconds * 1000)
    return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

cues, group = [], []
for w in clean:
    group.append(w)
    text = ' '.join(x['word'].strip() for x in group)
    if len(text) >= 68 or w['word'].endswith(('.', '?', '!')) or w['end']-group[0]['start'] >= 4:
        cues.append((group[0]['start'], w['end'], text))
        group = []
if group:
    cues.append((group[0]['start'], group[-1]['end'], ' '.join(w['word'].strip() for w in group)))
assert cues and all(0 <= start < end <= 118 for start, end, _ in cues)
assert all(a[1] <= b[0]+0.03 for a, b in zip(cues, cues[1:])), 'Overlapping ASR cues'
output = root / 'out/narration.srt'
output.parent.mkdir(exist_ok=True)
output.write_text('\n\n'.join(f'{i+1}\n{stamp(s)} --> {stamp(e)}\n{textwrap.fill(t, width=56)}'
                             for i, (s, e, t) in enumerate(cues))+'\n')
print(f'{len(cues)} timed subtitle cues → {output.name}')
