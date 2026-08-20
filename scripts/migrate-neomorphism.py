#!/usr/bin/env python3
"""
iPOMS glassmorphism -> neumorphism / mild claymorphism sweep.

Removes every remaining backdrop-filter (backdrop-blur-*) utility and the raw
Tailwind shadow-*/rounded-* scale, replacing them with the token-driven
neumorphic elevation and clay radius defined in globals.css / tailwind.config.ts.

Rules
  1. backdrop-blur-* on a modal scrim (bg-black/NN backdrop-blur-*) -> the
     `.scrim` component class, which is solid (no blur), token-driven.
  2. Any other backdrop-blur-* (e.g. a sticky footer) -> dropped. The surface
     underneath is already opaque; blur was doing nothing but signalling glass.
  3. Raw shadow-{xs,sm,md,lg,xl,2xl} -> shadow-{1,2,3,4} (neumorphic dual-tone).

  Radius is deliberately NOT rewritten here. Collapsing rounded-lg/xl/2xl (three
  tiers, used on everything from an 8px badge to a modal) onto one value would
  balloon small elements into blobs. Instead the clay bump lives at the scale
  level in tailwind.config.ts -- lg/xl/2xl are overridden slightly larger, so
  every existing rounded-lg/xl/2xl className inherits it proportionally with
  zero risk to small components.

    python scripts/migrate-neomorphism.py            # dry run
    python scripts/migrate-neomorphism.py --apply
"""

import argparse
import collections
import io
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src')
EXT = ('.tsx',)

# Modal scrim: bg-black/NN [backdrop-blur-*] -> scrim class, blur removed.
SCRIM = re.compile(r'\bbg-black/(\d{1,3})\s+backdrop-blur(?:-\w+)?\b')
# Any remaining backdrop-blur not caught above -> dropped.
STRAY_BLUR = re.compile(r'\s?\bbackdrop-blur(?:-\w+)?\b')

SHADOW_MAP = {
    'shadow-xs': 'shadow-1', 'shadow-2xs': 'shadow-1', 'shadow-sm': 'shadow-1',
    'shadow-md': 'shadow-2', 'shadow-lg': 'shadow-3',
    'shadow-xl': 'shadow-4', 'shadow-2xl': 'shadow-4',
}
SHADOW = re.compile(r'\b(' + '|'.join(re.escape(k) for k in SHADOW_MAP) + r')\b')

def process(text):
    counts = collections.Counter()

    def scrim_sub(m):
        counts['scrim (blur removed)'] += 1
        return 'scrim'

    text = SCRIM.sub(scrim_sub, text)

    def stray_sub(m):
        counts['stray backdrop-blur (dropped)'] += 1
        return ''

    text = STRAY_BLUR.sub(stray_sub, text)

    def shadow_sub(m):
        new = SHADOW_MAP[m.group(1)]
        counts[f'{m.group(1)} -> {new}'] += 1
        return new

    text = SHADOW.sub(shadow_sub, text)
    return text, counts


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    total = collections.Counter()
    changed = []

    for root, _d, files in os.walk(ROOT):
        for f in sorted(files):
            if not f.endswith(EXT):
                continue
            path = os.path.join(root, f)
            original = io.open(path, encoding='utf-8').read()
            text, counts = process(original)
            if text == original:
                continue
            total.update(counts)
            changed.append((os.path.relpath(path, ROOT).replace(os.sep, '/'), sum(counts.values())))
            if args.apply:
                io.open(path, 'w', encoding='utf-8').write(text)

    print('=' * 70)
    print(f"  GLASSMORPHISM -> NEUMORPHISM/CLAY  {'APPLIED' if args.apply else 'DRY RUN'}")
    print('=' * 70)
    print(f'  files changed   {len(changed)}')
    print(f'  replacements    {sum(total.values())}')
    print()
    for k, v in total.most_common():
        print(f'   {v:>4}  {k}')
    print()
    for rel, n in sorted(changed, key=lambda x: -x[1])[:20]:
        print(f'   {n:>4}  {rel}')
    if not args.apply:
        print('\n  Re-run with --apply to write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
