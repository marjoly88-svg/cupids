// Service Worker for Cupids PWA
// Firebase Cloud Messaging用

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyA52uJ31HzLkbz32lA-3WWSmhM10xYjjCg",
    authDomain: "cupids-chat.firebaseapp.com",
    projectId: "cupids-chat",
    storageBucket: "cupids-chat.firebasestorage.app",
    messagingSenderId: "44532110483",
    appId: "1:44532110483:web:d6266e8abba8582b8b6966"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// バックグラウンド通知の処理
messaging.onBackgroundMessage((payload) => {
    console.log('[Service Worker] バックグラウンド通知受信:', payload);

    const notificationTitle = payload.notification.title || 'キューピッズ';
    const notificationOptions = {
        body: payload.notification.body || '新しいメッセージがあります',
        icon: '/icon-192.png',
        badge: '/badge-72.png',
        tag: payload.data?.conversationId || 'cupids-notification',
        data: payload.data,
        requireInteraction: true,
        vibrate: [200, 100, 200]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] 通知クリック:', event);
    
    event.notification.close();

    const data = event.notification.data || {};
    let urlToOpen = '/';

    // 通知の種類に応じてURLを変更
    if (data.type === 'new_message') {
        if (data.userType === 'client') {
            urlToOpen = `/mail-chat.html?id=${data.conversationId}`;
        } else if (data.userType === 'fortune-teller') {
            urlToOpen = `/fortune-chat.html?id=${data.conversationId}`;
        }
    } else if (data.type === 'new_consultation') {
        urlToOpen = '/fortune-lobby.html';
    } else if (data.type === 'points_added') {
        urlToOpen = '/mypage.html';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // 既に開いているウィンドウがあればフォーカス
                for (const client of clientList) {
                    if (client.url.includes(urlToOpen) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // なければ新しいウィンドウを開く
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Service Workerのインストール
self.addEventListener('install', (event) => {
    console.log('[Service Worker] インストール');
    self.skipWaiting();
});

// Service Workerの有効化
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] 有効化');
    event.waitUntil(clients.claim());
});
