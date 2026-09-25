/**
 * A tiny bridge so the shared Sign out button can ask "did you send today's emails?" before it signs
 * the person out, without knowing anything about that popup.
 *
 * The popup component registers a gate; the button awaits it. With no gate registered (or on any error)
 * the promise resolves at once, so sign-out can never be blocked by this feature.
 */
type Gate = () => Promise<void>;

let gate: Gate | null = null;

export function registerSignOutGate(g: Gate | null) {
  gate = g;
}

export async function runSignOutGate(): Promise<void> {
  if (!gate) return;
  try {
    await gate();
  } catch {
    /* never block sign-out */
  }
}
