// #9 앱 잠금. PIN 해시 + (가능하면) WebAuthn 생체. localStorage 영속.

const LS_PIN = 'bt_applock_pin'; // SHA-256 hex
const LS_ENABLED = 'bt_applock_enabled';
const LS_WEBAUTHN = 'bt_applock_webauthn_cred'; // base64 credentialId

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const appLock = {
  isEnabled(): boolean {
    return localStorage.getItem(LS_ENABLED) === '1' && !!localStorage.getItem(LS_PIN);
  },

  async setPin(pin: string): Promise<void> {
    const hash = await sha256Hex(pin);
    localStorage.setItem(LS_PIN, hash);
    localStorage.setItem(LS_ENABLED, '1');
  },

  async verifyPin(pin: string): Promise<boolean> {
    const stored = localStorage.getItem(LS_PIN);
    if (!stored) return false;
    return (await sha256Hex(pin)) === stored;
  },

  disable(): void {
    localStorage.removeItem(LS_PIN);
    localStorage.removeItem(LS_ENABLED);
    localStorage.removeItem(LS_WEBAUTHN);
  },

  // ---- WebAuthn 생체 (선택적, 지원 시) ----
  webAuthnSupported(): boolean {
    return typeof window !== 'undefined' && !!window.PublicKeyCredential;
  },

  hasWebAuthn(): boolean {
    return !!localStorage.getItem(LS_WEBAUTHN);
  },

  /** 생체 등록. 성공 시 credentialId 저장. */
  async registerWebAuthn(userName: string): Promise<boolean> {
    if (!this.webAuthnSupported()) return false;
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));
      const cred = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'BaboTalk' },
          user: { id: userId, name: userName, displayName: userName },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: { userVerification: 'preferred' },
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
      if (!cred) return false;
      const idB64 = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
      localStorage.setItem(LS_WEBAUTHN, idB64);
      return true;
    } catch (e) {
      console.warn('[appLock] WebAuthn 등록 실패', e);
      return false;
    }
  },

  /** 생체 인증. 성공 시 true. */
  async verifyWebAuthn(): Promise<boolean> {
    if (!this.hasWebAuthn()) return false;
    try {
      const idB64 = localStorage.getItem(LS_WEBAUTHN)!;
      const rawId = Uint8Array.from(atob(idB64), (c) => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ type: 'public-key', id: rawId }],
          userVerification: 'preferred',
          timeout: 60000,
        },
      });
      return !!assertion;
    } catch (e) {
      console.warn('[appLock] WebAuthn 인증 실패', e);
      return false;
    }
  },
};
