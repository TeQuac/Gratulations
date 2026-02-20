const CONFIG_CACHE = "birthday-config-v1";
const CONFIG_URL = "/__birthday_config__";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "SYNC_BIRTHDAY_CONFIG") return;
  event.waitUntil(saveConfig(event.data.payload));
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag !== "birthday-daily-check") return;
  event.waitUntil(notifyTodaysBirthdays());
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "birthday-fallback-check") return;
  event.waitUntil(notifyTodaysBirthdays());
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() || {};
  const title = payload.title || "🎂 Geburtstagserinnerung";
  const body = payload.body || "Heute hat jemand aus deiner Liste Geburtstag.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.tag || `birthday-push-${Date.now()}`,
      data: payload.data || null,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow("./");
    }),
  );
});

async function saveConfig(payload) {
  const cache = await caches.open(CONFIG_CACHE);
  const response = new Response(JSON.stringify(payload || {}), {
    headers: { "Content-Type": "application/json" },
  });
  await cache.put(CONFIG_URL, response);
}

async function loadConfig() {
  const cache = await caches.open(CONFIG_CACHE);
  const response = await cache.match(CONFIG_URL);
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function notifyTodaysBirthdays() {
  const config = await loadConfig();
  if (!config?.enabled || !Array.isArray(config.entries) || !config.trigger) return;

  const now = new Date();
  const hh = now.getHours();
  const mm = now.getMinutes();
  if (hh < config.trigger.hours || (hh === config.trigger.hours && mm < config.trigger.minutes)) return;

  const localMonth = String(now.getMonth() + 1).padStart(2, "0");
  const localDay = String(now.getDate()).padStart(2, "0");
  const todayKey = `${now.getFullYear()}-${localMonth}-${localDay}`;

  for (const entry of config.entries) {
    const [, month, day] = String(entry.birthDate || "").split("-");
    if (month !== localMonth || day !== localDay) continue;
    const tag = `birthday-reminder-${entry.id}-${todayKey}`;
    await self.registration.showNotification(`🎂 ${entry.personName} hat Geburtstag`, {
      body: `${entry.personName} hat heute Geburtstag. Öffne die App für deinen Glückwunschtext.`,
      tag,
      renotify: false,
      data: { entryId: entry.id },
    });
  }
}
