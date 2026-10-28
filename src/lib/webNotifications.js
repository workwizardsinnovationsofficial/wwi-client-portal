/**
 * Web Browser Notifications Helper
 * Provides permission requesting, notification triggering, and optional audio chime
 */

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (err) {
    console.warn('Notification permission request error:', err)
    return Notification.permission
  }
}

/**
 * Play a gentle two-tone notification audio chime using the Web Audio API
 * Requires no external audio assets
 */
export function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    const ctx = new AudioContext()
    const now = ctx.currentTime

    // Tone 1
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    gain1.gain.setValueAtTime(0.08, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.25)

    // Tone 2
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.12) // A5
    gain2.gain.setValueAtTime(0.1, now + 0.12)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.12)
    osc2.stop(now + 0.45)
  } catch {
    // AudioContext may be blocked or restricted prior to user gesture
  }
}

/**
 * Dispatch a native desktop browser notification
 */
export function sendWebNotification(title, { body, icon = '/favicon.ico', tag, data } = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null
  }

  try {
    playNotificationChime()

    const notification = new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: tag || `notif-${Date.now()}`,
      data,
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto close after 7 seconds
    setTimeout(() => {
      try {
        notification.close()
      } catch {
        // ignore
      }
    }, 7000)

    return notification
  } catch (err) {
    console.warn('Failed to dispatch web notification:', err)
    return null
  }
}
