/**
 * WhatsApp-style deterministic color palette for group members & roles.
 * Every coordinator gets a distinct, consistent, vibrant sender color for their
 * name, avatar ring, and message accents.
 */

export interface SenderColor {
  text: string;
  bgSubtle: string;
  border: string;
  badge: string;
  avatarBg: string;
}

const COORDINATOR_PALETTES: SenderColor[] = [
  {
    text: 'text-emerald-600 dark:text-emerald-400',
    bgSubtle: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500 text-white',
    avatarBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  {
    text: 'text-violet-600 dark:text-violet-400',
    bgSubtle: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    badge: 'bg-violet-500 text-white',
    avatarBg: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  {
    text: 'text-amber-600 dark:text-amber-400',
    bgSubtle: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500 text-white',
    avatarBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  {
    text: 'text-rose-600 dark:text-rose-400',
    bgSubtle: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    badge: 'bg-rose-500 text-white',
    avatarBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
  {
    text: 'text-cyan-600 dark:text-cyan-400',
    bgSubtle: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500 text-white',
    avatarBg: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  },
  {
    text: 'text-indigo-600 dark:text-indigo-400',
    bgSubtle: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    badge: 'bg-indigo-500 text-white',
    avatarBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  {
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    bgSubtle: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    badge: 'bg-fuchsia-500 text-white',
    avatarBg: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-300',
  },
  {
    text: 'text-blue-600 dark:text-blue-400',
    bgSubtle: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    badge: 'bg-blue-500 text-white',
    avatarBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
];

const ROLE_PALETTES: Record<string, SenderColor> = {
  Administrator: {
    text: 'text-blue-700 dark:text-blue-300',
    bgSubtle: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    badge: 'bg-blue-600 text-white',
    avatarBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  },
  'Team Leader': {
    text: 'text-teal-700 dark:text-teal-300',
    bgSubtle: 'bg-teal-500/15',
    border: 'border-teal-500/40',
    badge: 'bg-teal-600 text-white',
    avatarBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200',
  },
};

export function getSenderColor(nameOrId: string, role?: string): SenderColor {
  if (role && ROLE_PALETTES[role]) {
    return ROLE_PALETTES[role];
  }

  // Generate deterministic index based on characters
  let hash = 0;
  const str = String(nameOrId || 'Coordinator');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % COORDINATOR_PALETTES.length;
  return COORDINATOR_PALETTES[index];
}
