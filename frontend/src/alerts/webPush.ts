type PushRegistrationResult =
  | { ok: true; registration: ServiceWorkerRegistration }
  | { ok: false; reason: "push_not_supported" | "permission_denied" };

export async function registerAlertServiceWorker(): Promise<PushRegistrationResult> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "push_not_supported" };
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }
  return { ok: true, registration };
}

export async function subscribeToWebPush(vapidPublicKey: string) {
  const registered = await registerAlertServiceWorker();
  if (!registered.ok) return registered;
  const subscription = await registered.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  return { ok: true, subscription };
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
