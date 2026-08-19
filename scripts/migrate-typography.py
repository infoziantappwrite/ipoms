#!/usr/bin/env python3
"""
iPOMS typography migration — raise the type floor.

114 x text-[10px] and 91 x text-[11px] sit below the readable minimum for an
all-day operational tool. Both map to `text-micro` (12px), which is the floor of
the scale defined in tailwind.config.ts.

Deliberately NOT touched: the 315 `text-xs` uses. text-xs is already 12px, so it
is at the floor and safe. Promoting table cells and inputs from 12px to 14px
(`text-body`) is the real ergonomic win, but it changes row heights and column
widths, so it belongs in a per-surface pass with eyes on the result -- not a
blanket regex.

    python scripts/migrate-typography.py            # dry run
    python scripts/migrate-typography.py --apply
"""

import argparse
import collections
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src')
EXT = ('.tsx', '.ts')

RULES = [
    (re.compile(r'\btext-\[10px\]'), 'text-micro', '10px -> 12px (below readable minimum)'),
    (re.compile(r'\btext-\[11px\]'), 'text-micro', '11px -> 12px (below readable minimum)'),
    (re.compile(r'\btext-\[9px\]'), 'text-micro', '9px  -> 12px (below readable minimum)'),
    (re.compile(r'\btext-\[13px\]'), 'text-body', '13px -> 14px (snap to scale)'),
]


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    applied = collections.Counter()
    changed = []

    for root, _d, files in os.walk(ROOT):
        for f in sorted(files):
            if not f.endswith(EXT):
                continue
            path = os.path.join(root, f)
            with open(path, encoding='utf-8') as fh:
                original = fh.read()
            text = original
            for pattern, repl, label in RULES:
                text, n = pattern.subn(repl, text)
                if n:
                    applied[label] += n
            if text != original:
                changed.append(os.path.relpath(path, ROOT).replace(os.sep, '/'))
                if args.apply:
                    with open(path, 'w', encoding='utf-8') as fh:
                        fh.write(text)

    print('=' * 70)
    print(f"  iPOMS TYPOGRAPHY FLOOR -- {'APPLIED' if args.apply else 'DRY RUN'}")
    print('=' * 70)
    print(f'  files changed  {len(changed)}')
    print(f'  replacements   {sum(applied.values())}')
    print()
    for k, v in applied.most_common():
        print(f'   {v:>5}  {k}')
    if not args.apply:
        print('\n  Re-run with --apply to write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
