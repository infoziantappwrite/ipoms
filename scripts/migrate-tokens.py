#!/usr/bin/env python3
"""
iPOMS design-token migration.

Rewrites raw Tailwind palette utilities (bg-slate-800, text-slate-400, ...) to the
semantic tokens defined in frontend/src/app/globals.css.

    python scripts/migrate-tokens.py            # dry run  -- report only
    python scripts/migrate-tokens.py --apply    # rewrite files in place
    python scripts/migrate-tokens.py --apply --backup

Tiers
  A  mechanical  1:1, safe to auto-apply
  B  contextual  auto-applied but listed for review (meaning may vary by site)
  C  removal     the utility is deleted; behaviour moves to the global focus ring
  -  categorical left alone on purpose (module identity colours)
"""

import argparse
import collections
import os
import re
import shutil
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src')
EXT = ('.tsx', '.ts', '.css')

# -----------------------------------------------------------------------------
# THE MAP.  key = (prefix, family, shade)   value = (token, tier, note)
# Alpha suffixes (/20, /60 ...) are preserved automatically.
# -----------------------------------------------------------------------------

MAP = {}


def add(prefixes, families, shades, token, tier='A', note=''):
    for p in prefixes.split():
        for fam in families.split():
            for s in str(shades).split():
                MAP[(p, fam, s)] = (f'{p}-{token}', tier, note)


# -- SURFACES ----------------------------------------------------------------
add('bg', 'slate', '950 900', 'background', 'A', 'page canvas')
add('bg', 'slate', '50', 'background', 'A', 'page canvas (light)')
add('bg', 'slate', '800', 'surface', 'A', 'card / panel / table')
add('bg', 'slate', '700 600', 'surface-raised', 'A', 'dropdown, hover, elevated')
add('bg', 'slate', '100 200', 'surface-sunken', 'A', 'table header, toolbar, inset')
add('bg', 'slate', '300 400 500', 'surface-raised', 'B', 'verify: was this a fill or a divider?')

# -- FOREGROUND --------------------------------------------------------------
# Dark-context and light-context values converge on the same semantic token --
# that convergence is the point: the token resolves correctly per theme.
add('text', 'slate', '50 100 200', 'fg', 'A', 'primary text (was dark-theme)')
add('text', 'slate', '900 800', 'fg', 'A', 'primary text (was light-theme)')
add('text', 'slate', '300', 'fg-muted', 'A', 'secondary (was dark-theme)')
add('text', 'slate', '600 700', 'fg-muted', 'A', 'secondary (was light-theme)')
add('text', 'slate', '400', 'fg-subtle', 'A', 'FIXES 2.56:1 contrast fail on white')
add('text', 'slate', '500', 'fg-subtle', 'A', 'meta / labels')
add('placeholder', 'slate', '400 500 600', 'fg-subtle', 'A', '')

# -- LINES -------------------------------------------------------------------
add('border divide', 'slate', '800 200 100', 'border', 'A', '')
add('border divide', 'slate', '700 600 500 400 300', 'border-strong', 'A', '')

# -- BRAND -------------------------------------------------------------------
add('bg', 'blue', '400 500 600 700 800 900 950', 'primary', 'A', 'primary action')
add('to from via', 'slate', '50 100 800 900 950', 'background', 'B', 'gradient stop')
add('bg', 'blue', '50 100 200', 'primary-subtle', 'A', 'tinted background')
add('text', 'blue', '300 400 500 600 700 800 900', 'primary', 'A', '')
add('text', 'blue', '50 100', 'primary-foreground', 'B', 'verify: on a primary fill?')
add('border', 'blue', '400 500 600 700 800', 'primary', 'A', 'non-focus borders only')
add('border', 'blue', '100 200', 'primary-subtle', 'A', '')
add('ring', 'blue', '100 200 500 600', 'ring', 'A', '')
add('accent shadow from to via', 'blue', '50 100 500 600 950', 'primary', 'B', '')

# -- STATUS: success ---------------------------------------------------------
add('bg', 'emerald', '400 500 600 700 800 900 950', 'success', 'A', '')
add('bg', 'emerald', '50 100', 'success-subtle', 'A', '')
add('text', 'emerald', '300 400 500 600 700 800', 'success', 'A', '')
add('text', 'emerald', '50', 'success-foreground', 'B', '')
add('border', 'emerald', '200 300 500 600', 'success', 'A', '')

# -- STATUS: destructive (red + rose collapse to one hue) --------------------
add('bg', 'red rose', '400 500 600 700 800 900 950', 'destructive', 'A', '')
add('bg', 'red rose', '50 100 200', 'destructive-subtle', 'A', '')
add('text', 'red rose', '300 400 500 600 700 800', 'destructive', 'A', '')
add('border', 'red rose', '200 300 500 600', 'destructive', 'A', '')

# -- STATUS: warning (amber + yellow + orange collapse to one hue) -----------
add('bg', 'amber yellow orange', '400 500 600 700 800 900 950', 'warning', 'A', '')
add('bg', 'amber yellow orange', '50 100 200', 'warning-subtle', 'A', '')
add('text', 'amber yellow orange', '200 300 400 500 600 700', 'warning', 'A', '')
add('text', 'amber yellow orange', '100', 'warning-foreground', 'B', '')
add('border', 'amber yellow orange', '200 500 600', 'warning', 'A', '')

# -----------------------------------------------------------------------------
# TIER C -- removals. The global :focus-visible ring in globals.css replaces
# these. 115 outline-none + 95 focus:border-* currently leave ~104 interactive
# elements with no visible keyboard focus indicator at all.
# -----------------------------------------------------------------------------
REMOVE = [
    (re.compile(r'\bfocus:outline-none\b\s*'), 'focus:outline-none'),
    (re.compile(r'(?<!focus-visible:)(?<!focus:)\boutline-none\b\s*'), 'outline-none'),
    (re.compile(r'\bfocus:border-(?:blue|slate|indigo|cyan)-\d{2,3}(?:/\d{1,3})?\b\s*'), 'focus:border-*'),
    (re.compile(r'\bfocus:ring-(?:\d|offset-\d|[a-z]+-\d{2,3})(?:/\d{1,3})?\b\s*'), 'focus:ring-*'),
]

# -----------------------------------------------------------------------------
# LEFT ALONE -- categorical module-identity colours (home page module cards,
# report themes). These are legitimate categorical colour, not status colour.
# Promote them to a defined --module-1..8 ramp rather than folding into accent.
# -----------------------------------------------------------------------------
CATEGORICAL = {'purple', 'indigo', 'cyan', 'violet', 'fuchsia', 'pink', 'sky', 'teal', 'lime'}

# -----------------------------------------------------------------------------
# TIER B -- literal rewrites.
# IBM Plex Sans ships 100-700. font-black (900) and font-extrabold (800) have no
# real file behind them, so the browser synthesises a faux-bold that smears at
# 12-14px. Collapsing them to 700 also cuts the weight ramp from 6 steps to 4.
# -----------------------------------------------------------------------------
REWRITE = [
    (re.compile(r'\bfont-black\b'), 'font-bold', 'font-black -> font-bold  (900 not in IBM Plex Sans)'),
    (re.compile(r'\bfont-extrabold\b'), 'font-bold', 'font-extrabold -> font-bold  (800 not in IBM Plex Sans)'),
]

PREFIX = (r'(?:bg|text|border|ring|divide|from|to|via|placeholder|decoration'
          r'|outline|accent|caret|shadow|fill|stroke)')
FAMILY = (r'(?:slate|gray|zinc|neutral|stone|blue|indigo|cyan|sky|emerald|green|teal'
          r'|amber|yellow|orange|red|rose|pink|purple|violet|fuchsia|lime)')
SHADE = r'(?:950|900|800|700|600|500|400|300|200|100|50)'
UTIL = re.compile(rf'\b({PREFIX})-({FAMILY})-({SHADE})(/\d{{1,3}})?(?![\w-])')


def migrate(text):
    """Return (new_text, applied_counter, removed_counter, unmapped_counter)."""
    applied, removed, unmapped = collections.Counter(), collections.Counter(), collections.Counter()

    for pattern, label in REMOVE:
        text, n = pattern.subn('', text)
        if n:
            removed[label] += n

    for pattern, replacement, label in REWRITE:
        text, n = pattern.subn(replacement, text)
        if n:
            applied[f'{label}  [B]'] += n

    def repl(m):
        prefix, family, shade, alpha = m.group(1), m.group(2), m.group(3), m.group(4) or ''
        if family in CATEGORICAL:
            unmapped[f'{m.group(0)}  (categorical -- keep)'] += 1
            return m.group(0)
        hit = MAP.get((prefix, family, shade))
        if not hit:
            unmapped[m.group(0)] += 1
            return m.group(0)
        token, tier, _ = hit
        applied[f'{prefix}-{family}-{shade}{alpha} -> {token}{alpha}  [{tier}]'] += 1
        return token + alpha

    return UTIL.sub(repl, text), applied, removed, unmapped


def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='write changes to disk')
    ap.add_argument('--backup', action='store_true', help='write .bak alongside each changed file')
    args = ap.parse_args()

    applied = collections.Counter()
    removed = collections.Counter()
    unmapped = collections.Counter()
    changed_files = []

    for root, _dirs, files in os.walk(ROOT):
        for f in sorted(files):
            if not f.endswith(EXT):
                continue
            path = os.path.join(root, f)
            with open(path, encoding='utf-8') as fh:
                original = fh.read()
            new, a, r, u = migrate(original)
            applied.update(a)
            removed.update(r)
            unmapped.update(u)
            if new != original:
                rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
                changed_files.append((rel, sum(a.values()) + sum(r.values())))
                if args.apply:
                    if args.backup:
                        shutil.copy2(path, path + '.bak')
                    with open(path, 'w', encoding='utf-8') as fh:
                        fh.write(new)

    mode = 'APPLIED' if args.apply else 'DRY RUN -- nothing written'
    total_repl = sum(applied.values())
    total_rem = sum(removed.values())
    total_un = sum(unmapped.values())

    print('=' * 78)
    print(f'  iPOMS TOKEN MIGRATION -- {mode}')
    print('=' * 78)
    print(f'  files changed      {len(changed_files)}')
    print(f'  utilities mapped   {total_repl}')
    print(f'  utilities removed  {total_rem}   (focus / outline anti-patterns)')
    print(f'  left unmapped      {total_un}')
    denom = total_repl + total_rem + total_un
    if denom:
        print(f'  coverage           {100 * (total_repl + total_rem) / denom:.1f}%')
    print()

    print('-- REMOVED (Tier C) ' + '-' * 58)
    for k, v in removed.most_common():
        print(f'   {v:>5}  {k}')
    print()

    print('-- MAPPED, top 40 (Tier A/B) ' + '-' * 49)
    for k, v in applied.most_common(40):
        print(f'   {v:>5}  {k}')
    print()

    if unmapped:
        print('-- UNMAPPED -- needs a decision ' + '-' * 47)
        for k, v in unmapped.most_common(30):
            print(f'   {v:>5}  {k}')
        print()

    print('-- FILES ' + '-' * 69)
    for rel, n in sorted(changed_files, key=lambda x: -x[1])[:25]:
        print(f'   {n:>5}  {rel}')
    if len(changed_files) > 25:
        print(f'          ... and {len(changed_files) - 25} more')

    if not args.apply:
        print('\n  Re-run with --apply (add --backup for .bak copies) to write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
