/**
 * Tactile / Haptic Feedback Utility (Apple Design Foundation)
 * Provides multimodal physical feedback for mobile devices (Capacitor native bridge & Web Vibration API).
 * Fails completely silently and safely on non-supporting desktop browsers.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Triggers a micro-haptic pattern corresponding to the specified action or state.
 */
export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined') return;

  // 1. Try Capacitor Native Haptics if available on window
  const capacitor = (window as any)?.Capacitor;
  const HapticsPlugin = capacitor?.Plugins?.Haptics;

  if (HapticsPlugin) {
    try {
      switch (style) {
        case 'selection':
          HapticsPlugin.selectionStart?.();
          return;
        case 'light':
          HapticsPlugin.impact?.({ style: 'LIGHT' });
          return;
        case 'medium':
          HapticsPlugin.impact?.({ style: 'MEDIUM' });
          return;
        case 'heavy':
          HapticsPlugin.impact?.({ style: 'HEAVY' });
          return;
        case 'success':
          HapticsPlugin.notification?.({ type: 'SUCCESS' });
          return;
        case 'warning':
          HapticsPlugin.notification?.({ type: 'WARNING' });
          return;
        case 'error':
          HapticsPlugin.notification?.({ type: 'ERROR' });
          return;
      }
    } catch {
      // Fall through to navigator.vibrate
    }
  }

  // 2. Fallback to Web Vibration API if supported by the device
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      switch (style) {
        case 'selection':
          navigator.vibrate(8);
          break;
        case 'light':
          navigator.vibrate(12);
          break;
        case 'medium':
          navigator.vibrate(22);
          break;
        case 'heavy':
          navigator.vibrate(35);
          break;
        case 'success':
          navigator.vibrate([12, 40, 16]);
          break;
        case 'warning':
          navigator.vibrate([18, 50, 18]);
          break;
        case 'error':
          navigator.vibrate([25, 40, 25, 40, 25]);
          break;
      }
    } catch {
      // Ignore vibration failures silently
    }
  }
}
