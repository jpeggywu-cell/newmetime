// ── Me Time Service Worker ──
// 負責：後台計時、Push 通知、離線快取

const CACHE_NAME = 'metime-v1';

// ── 安裝：快取主頁面 ──
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(['/']))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// ── 後台計時核心 ──
// 主頁面透過 postMessage 傳入 { type: 'START_TIMER', endTime: unix_ms }
// Service Worker 用 setTimeout 計算剩餘時間，結束時送出通知

let timerTimeout = null;

self.addEventListener('message', event => {
  const data = event.data;

  if (data.type === 'START_TIMER') {
    // 清掉舊計時
    if (timerTimeout) clearTimeout(timerTimeout);

    const remaining = data.endTime - Date.now();
    if (remaining <= 0) return;

    timerTimeout = setTimeout(() => {
      // 時間到 → 發通知
      self.registration.showNotification('⚡ Me Time', {
        body: '時間結束了！',
        icon: 'https://cdn-icons-png.flaticon.com/512/3106/3106775.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/3106/3106775.png',
        tag: 'metime-timer',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open', title: '開啟網頁 →' }
        ]
      });

      // 通知主頁面（如果還開著）
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'TIMER_DONE' }));
      });

    }, remaining);

    console.log(`[SW] 計時器啟動，${Math.round(remaining / 1000)} 秒後通知`);
  }

  if (data.type === 'CANCEL_TIMER') {
    if (timerTimeout) {
      clearTimeout(timerTimeout);
      timerTimeout = null;
      console.log('[SW] 計時器已取消');
    }
  }
});

// ── 點擊通知 → 開啟網頁 ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
