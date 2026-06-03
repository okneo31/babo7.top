// #1 웹푸시. SW 등록은 vite-plugin-pwa(autoUpdate)가 처리.
// vapid-key 수신 → PushManager.subscribe → /api/push/subscribe.

import type { PushSubscription as SharedPushSubscription } from '@babotalk/shared';
import { api } from '@/api/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** PushSubscription → shared 형태로 직렬화. */
function serialize(sub: PushSubscription): SharedPushSubscription | null {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

/**
 * 푸시 구독 보장. 로그인 후 1회 호출.
 * - Notification 권한 요청
 * - SW ready 대기 → 기존 구독 재사용 또는 신규 구독
 * - 서버에 등록
 */
export async function ensurePushSubscription(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = await api.vapidKey();
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const serialized = serialize(sub);
    if (!serialized) return false;
    await api.subscribePush({ subscription: serialized });
    return true;
  } catch (e) {
    console.warn('[push] 구독 실패', e);
    return false;
  }
}

/** 인앱 알림(포그라운드, 비활성 방 새 메시지). */
export function showLocalNotification(title: string, body: string): void {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    /* ignore */
  }
}
