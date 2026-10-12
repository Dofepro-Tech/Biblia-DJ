import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export async function openExternalUrl(url: string) {
  if (!url) {
    return;
  }

  const isApk = url.toLowerCase().includes('.apk');

  if (isApk && Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    try {
      window.open(url, '_system');
      return;
    } catch {
      // Fallback
    }
  }

  try {
    await Browser.open({ url });
    return;
  } catch {
    if (typeof window === 'undefined') {
      return;
    }

    const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (!openedWindow) {
      window.location.assign(url);
    }
  }
}