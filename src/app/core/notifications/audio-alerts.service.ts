import { Injectable, signal } from '@angular/core';

export type AlertTone = 'order' | 'late' | 'offer' | 'radar' | 'arrival' | 'success';

function readPreference(key: string, fallback: boolean): boolean {
  if (typeof localStorage === 'undefined') return fallback;
  return localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) === 'true';
}

@Injectable({ providedIn: 'root' })
export class AudioAlertsService {
  readonly soundEnabled = signal(readPreference('prattio.alert.sound', true));
  readonly voiceEnabled = signal(readPreference('prattio.alert.voice', false));
  readonly naturalVoiceName = signal('');
  readonly notificationsEnabled = signal(readPreference('prattio.alert.notifications', true));
  readonly audioReady = signal(false);
  readonly notificationPermission = signal<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  private context: AudioContext | null = null;
  private preferredVoice: SpeechSynthesisVoice | null = null;
  private readonly pendingTones: AlertTone[] = [];
  private readonly activeOscillators = new Map<AlertTone, Set<OscillatorNode>>();
  private nextToneAt = 0;

  constructor() {
    if (typeof speechSynthesis === 'undefined') return;
    this.refreshNaturalVoice();
    speechSynthesis.addEventListener('voiceschanged', () => this.refreshNaturalVoice());
  }

  async activateFromUserGesture(): Promise<void> {
    if (typeof window === 'undefined') return;
    const AudioContextConstructor = window.AudioContext;
    if (AudioContextConstructor) {
      this.context ??= new AudioContextConstructor();
      try {
        await this.context.resume();
        this.audioReady.set(this.context.state === 'running');
        if (this.audioReady()) {
          this.pendingTones.splice(0).forEach((tone) => this.playTone(tone));
        }
      } catch {
        this.audioReady.set(false);
      }
    }
  }

  async requestNotificationPermission(): Promise<void> {
    if (typeof Notification === 'undefined') {
      this.notificationPermission.set('unsupported');
      return;
    }
    try {
      this.notificationPermission.set(await Notification.requestPermission());
    } catch {
      this.notificationPermission.set('denied');
    }
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    this.soundEnabled.set(enabled);
    this.persist('prattio.alert.sound', enabled);
    if (enabled) await this.activateFromUserGesture();
  }

  setVoiceEnabled(enabled: boolean): boolean {
    if (enabled && !this.preferredVoice) {
      this.voiceEnabled.set(false);
      this.persist('prattio.alert.voice', false);
      return false;
    }
    this.voiceEnabled.set(enabled);
    this.persist('prattio.alert.voice', enabled);
    return true;
  }

  setNotificationsEnabled(enabled: boolean): void {
    this.notificationsEnabled.set(enabled);
    this.persist('prattio.alert.notifications', enabled);
  }

  cancelTone(tone: AlertTone): void {
    for (let index = this.pendingTones.length - 1; index >= 0; index--) {
      if (this.pendingTones[index] === tone) this.pendingTones.splice(index, 1);
    }
    this.activeOscillators.get(tone)?.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // The oscillator may have already stopped naturally.
      }
    });
    this.activeOscillators.delete(tone);
    if (tone === 'offer' && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  announce(
    message: string,
    title: string,
    tone: AlertTone,
    options: { speak?: boolean; notify?: boolean } = {},
  ): void {
    if (this.soundEnabled()) {
      if (this.audioReady()) this.playTone(tone);
      else this.pendingTones.push(tone);
    }
    if (
      options.speak !== false &&
      this.voiceEnabled() &&
      this.preferredVoice &&
      typeof speechSynthesis !== 'undefined'
    ) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'pt-BR';
      utterance.voice = this.preferredVoice;
      utterance.rate = 0.92;
      utterance.pitch = 1.02;
      speechSynthesis.speak(utterance);
    }
    if (
      options.notify !== false &&
      this.notificationsEnabled() &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      new Notification(title, {
        body: message,
        icon: '/assets/images/prattio-logos/logo-icon.svg',
      });
    }
  }

  private playTone(tone: AlertTone): void {
    if (!this.context || this.context.state !== 'running') return;
    const frequencies: Record<AlertTone, number[]> = {
      order: [660, 880],
      late: [740, 740, 520],
      offer: [784, 988, 1175, 988, 1318, 1175],
      radar: [1046, 1318],
      arrival: [520, 740],
      success: [660, 990],
    };
    const spacing = tone === 'radar' ? 0.12 : tone === 'offer' ? 0.2 : 0.17;
    const duration = tone === 'radar' ? 0.09 : tone === 'offer' ? 0.18 : 0.14;
    const start = Math.max(this.context.currentTime + 0.02, this.nextToneAt);
    const oscillators = new Set<OscillatorNode>();
    this.activeOscillators.set(tone, oscillators);
    this.nextToneAt = start + frequencies[tone].length * spacing + 0.08;
    frequencies[tone].forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const begins = start + index * spacing;
      oscillator.type = tone === 'offer' || tone === 'radar' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(frequency, begins);
      gain.gain.setValueAtTime(0.0001, begins);
      gain.gain.exponentialRampToValueAtTime(0.12, begins + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, begins + duration);
      oscillator.connect(gain);
      gain.connect(this.context!.destination);
      oscillator.start(begins);
      oscillator.stop(begins + duration + 0.01);
      oscillators.add(oscillator);
      oscillator.addEventListener('ended', () => {
        oscillators.delete(oscillator);
        if (!oscillators.size && this.activeOscillators.get(tone) === oscillators) {
          this.activeOscillators.delete(tone);
        }
      });
    });
  }

  private persist(key: string, value: boolean): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(value));
  }

  private refreshNaturalVoice(): void {
    const voices = speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith('pt-br'));
    this.preferredVoice =
      voices.find((voice) => /natural|online|google|microsoft/i.test(voice.name)) ?? null;
    this.naturalVoiceName.set(this.preferredVoice?.name ?? '');
    if (!this.preferredVoice) {
      this.voiceEnabled.set(false);
      this.persist('prattio.alert.voice', false);
    }
  }
}
