#!/usr/bin/env python3
"""
iPOMS emoji -> Lucide icon migration.

Only rewrites emoji in structurally safe positions:

  1. self-contained  <span ...>EMOJI</span>          -> <Icon size=.. aria-hidden />
  2. JSX text prefix  >EMOJI Some Label              -> the emoji is dropped and an
                                                        <Icon/> is placed before it
Emoji inside plain string literals (alert() text, console.log, data payloads) are
left alone -- a JSX element cannot be spliced into a string. Those disappear when
the 41 alert() calls become toasts.

    python scripts/migrate-icons.py            # dry run
    python scripts/migrate-icons.py --apply
"""

import argparse
import collections
import io
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'src')

# Emoji -> Lucide component. One family, consistent stroke, themeable via currentColor.
ICON = {
    '✓': 'Check', '✔': 'Check', '☑': 'CheckSquare',
    '✕': 'X', '✖': 'X', '❌': 'X', '🚫': 'Ban',
    '➕': 'Plus', '➖': 'Minus',
    '📥': 'Download', '📤': 'Upload', '💾': 'Save',
    '📋': 'ClipboardList', '📝': 'PenLine', '✏': 'Pencil', '✏️': 'Pencil',
    '🗑': 'Trash2', '🗑️': 'Trash2',
    '📅': 'CalendarDays', '📆': 'CalendarDays', '⏰': 'AlarmClock', '🕐': 'Clock',
    '🏢': 'Building2', '🏛': 'Landmark', '🏛️': 'Landmark',
    '📢': 'Megaphone', '🔔': 'Bell', '📣': 'Megaphone',
    '⚠': 'AlertTriangle', '⚠️': 'AlertTriangle', '🚨': 'AlertTriangle',
    '📊': 'BarChart3', '📈': 'TrendingUp', '📉': 'TrendingDown',
    '📑': 'FileSpreadsheet', '📄': 'FileText', '🖨': 'Printer', '🖨️': 'Printer',
    '🔄': 'RefreshCw', '🔃': 'RefreshCw', '♻': 'RotateCcw',
    '⚙': 'Settings', '⚙️': 'Settings',
    '🔍': 'Search', '🔎': 'Search',
    '🎯': 'Target', '🚀': 'Rocket', '⚡': 'Zap', '✨': 'Sparkles',
    '🌐': 'Globe', '✉': 'Mail', '✉️': 'Mail', '📧': 'Mail',
    '📞': 'Phone', '☎': 'Phone', '📱': 'Smartphone',
    '👤': 'User', '👥': 'Users', '👑': 'Crown',
    '🔐': 'LogIn', '🔒': 'Lock', '🔓': 'LockOpen',
    '⭐': 'Star', '📌': 'Pin', '🏆': 'Trophy',
    '💼': 'Briefcase', '🎓': 'GraduationCap',
    '←': 'ArrowLeft', '→': 'ArrowRight', '▶': 'ChevronRight', '◀': 'ChevronLeft',
}

EMOJI_CLASS = '[\U0001F300-\U0001FAFF☀-➿⬀-⯿]'
SPAN = re.compile(rf'<span(?:\s+className="[^"]*")?\s*>\s*({EMOJI_CLASS}️?)\s*</span>')
PREFIX = re.compile(rf'>(\s*)({EMOJI_CLASS}️?)\s+(?=[A-Za-z{{])')


def process(text):
    used = set()
    counts = collections.Counter()

    def span_sub(m):
        comp = ICON.get(m.group(1)) or ICON.get(m.group(1).rstrip('️'))
        if not comp:
            counts['unmapped'] += 1
            return m.group(0)
        used.add(comp)
        counts['span'] += 1
        return f'<{comp} size={{14}} strokeWidth={{2}} aria-hidden />'

    def prefix_sub(m):
        comp = ICON.get(m.group(2)) or ICON.get(m.group(2).rstrip('️'))
        if not comp:
            counts['unmapped'] += 1
            return m.group(0)
        used.add(comp)
        counts['prefix'] += 1
        return f'>{m.group(1)}<{comp} size={{15}} strokeWidth={{2}} className="inline shrink-0" aria-hidden />{{" "}}'

    text = SPAN.sub(span_sub, text)
    text = PREFIX.sub(prefix_sub, text)
    return text, used, counts


def ensure_import(text, comps):
    """Add or extend the lucide-react import."""
    if not comps:
        return text
    existing = re.search(r"import\s*\{([^}]*)\}\s*from\s*'lucide-react';", text)
    if existing:
        have = {c.strip() for c in existing.group(1).split(',') if c.strip()}
        merged = sorted(have | comps)
        return text.replace(
            existing.group(0),
            'import { ' + ', '.join(merged) + " } from 'lucide-react';",
        )
    line = 'import { ' + ', '.join(sorted(comps)) + " } from 'lucide-react';"
    imports = list(re.finditer(r"^import .*?;$", text, re.M))
    if imports:
        last = imports[-1]
        return text[: last.end()] + '\n' + line + text[last.end():]
    if text.lstrip().startswith("'use client'"):
        i = text.index('\n', text.index("'use client'"))
        return text[: i + 1] + '\n' + line + text[i + 1:]
    return line + '\n' + text


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

    for root, _d, fs in os.walk(ROOT):
        for f in sorted(fs):
            if not f.endswith('.tsx'):
                continue
            path = os.path.join(root, f)
            original = io.open(path, encoding='utf-8').read()
            text, used, counts = process(original)
            if text == original:
                continue
            text = ensure_import(text, used)
            total.update(counts)
            changed.append((os.path.relpath(path, ROOT).replace(os.sep, '/'),
                            counts['span'] + counts['prefix']))
            if args.apply:
                io.open(path, 'w', encoding='utf-8').write(text)

    print('=' * 66)
    print(f"  EMOJI -> LUCIDE  {'APPLIED' if args.apply else 'DRY RUN'}")
    print('=' * 66)
    print(f'  files changed        {len(changed)}')
    print(f'  <span> replacements  {total["span"]}')
    print(f'  JSX prefix           {total["prefix"]}')
    print(f'  unmapped (kept)      {total["unmapped"]}')
    print()
    for rel, n in sorted(changed, key=lambda x: -x[1])[:15]:
        print(f'   {n:>4}  {rel}')
    if not args.apply:
        print('\n  Re-run with --apply to write.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
