#!/usr/bin/env python3
"""Report remaining emoji-as-icon usage, grouped by file and by glyph."""
import collections
import io
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

E = re.compile('[\U0001F300-\U0001FAFF☀-➿⬀-⯿]')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src')

files = collections.Counter()
glyphs = collections.Counter()

for root, _d, fs in os.walk(ROOT):
    for f in fs:
        if not f.endswith('.tsx'):
            continue
        path = os.path.join(root, f)
        text = io.open(path, encoding='utf-8', errors='ignore').read()
        found = E.findall(text)
        if found:
            rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
            files[rel] = len(found)
            glyphs.update(found)

print(f'total glyphs: {sum(files.values())} across {len(files)} files\n')
for k, v in files.most_common(20):
    print(f'  {v:>4}  {k}')
print(f'\ndistinct glyphs: {len(glyphs)}')
print('  ' + '  '.join(f'{g}={n}' for g, n in glyphs.most_common(24)))
