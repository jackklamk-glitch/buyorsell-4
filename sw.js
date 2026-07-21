self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'BuyOrSell Alert', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'BuyOrSell Alert';
  const body = payload.body || 'Market rule triggered';
  const symbol = payload.symbol || '';
  const url = payload.url || `/`;

  event.waitUntil(self.registration.showNotification(title, {
    body: symbol ? `${symbol}: ${body}` : body,
    tag: payload.tag || `bos-alert-${symbol || Date.now()}`,
    data: { url },
    icon: '/favicon.ico',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(self.clients.openWindow(url));
});
