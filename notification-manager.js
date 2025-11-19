// Cupids PWA Notification Manager
// プッシュ通知の初期化と管理

class NotificationManager {
    constructor() {
        this.messaging = null;
        this.fcmToken = null;
        this.currentUser = null;
    }

    // 初期化
    async initialize(firebaseMessaging, currentUser) {
        this.messaging = firebaseMessaging;
        this.currentUser = currentUser;

        // 通知の許可状態をチェック
        if ('Notification' in window) {
            const permission = Notification.permission;
            console.log('通知許可状態:', permission);

            if (permission === 'granted') {
                await this.setupNotifications();
            } else if (permission === 'default') {
                // 後で許可を求める（邪魔にならないタイミングで）
                console.log('通知許可は未設定です');
            }
        }
    }

    // 通知許可をリクエスト
    async requestPermission() {
        if (!('Notification' in window)) {
            console.log('このブラウザは通知をサポートしていません');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('通知が許可されました');
                await this.setupNotifications();
                return true;
            } else {
                console.log('通知が拒否されました');
                return false;
            }
        } catch (error) {
            console.error('通知許可エラー:', error);
            return false;
        }
    }

    // 通知のセットアップ
    async setupNotifications() {
        try {
            // Service Workerの登録
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('Service Worker登録成功:', registration);

            // FCMトークンを取得
            this.fcmToken = await this.messaging.getToken({
                vapidKey: 'BKinR2wc4E4bFSXWSHbxDutFKlFWS8oRPUKXdpkeYN2cj899LFmjtALgHBlmVzj5MHjQju9Tyg0znVLTEcJqnN8',
                serviceWorkerRegistration: registration
            });

            console.log('FCMトークン:', this.fcmToken);

            // トークンをFirestoreに保存
            if (this.currentUser && this.fcmToken) {
                await this.saveFCMToken();
            }

            // フォアグラウンド通知のリスナー
            this.messaging.onMessage((payload) => {
                console.log('フォアグラウンド通知受信:', payload);
                this.showLocalNotification(payload);
            });

            return this.fcmToken;

        } catch (error) {
            console.error('通知セットアップエラー:', error);
            return null;
        }
    }

    // FCMトークンをFirestoreに保存
    async saveFCMToken() {
        if (!this.currentUser || !this.fcmToken) return;

        try {
            const db = firebase.firestore();
            const userType = this.currentUser.type; // 'client' or 'fortune-teller'
            const collectionName = userType === 'fortune-teller' ? 'fortune-tellers' : 'clients';

            await db.collection(collectionName).doc(this.currentUser.uid).set({
                fcmToken: this.fcmToken,
                fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                notificationsEnabled: true
            }, { merge: true });

            console.log('FCMトークンを保存しました');
        } catch (error) {
            console.error('FCMトークン保存エラー:', error);
        }
    }

    // ローカル通知を表示（アプリが開いている時）
    showLocalNotification(payload) {
        const title = payload.notification?.title || 'キューピッズ';
        const options = {
            body: payload.notification?.body || '新しいメッセージがあります',
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            tag: payload.data?.conversationId || 'cupids',
            data: payload.data,
            requireInteraction: false,
            vibrate: [200, 100, 200]
        };

        // ブラウザ通知を表示
        if (Notification.permission === 'granted') {
            new Notification(title, options);
        }

        // アプリ内通知バッジも更新
        this.updateNotificationBadge();
    }

    // 通知バッジを更新
    updateNotificationBadge() {
        // TODO: 未読メッセージ数を取得してバッジに表示
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            // 未読数があればバッジを表示
            badge.style.display = 'block';
            badge.textContent = '1';
        }
    }

    // 通知を無効化
    async disableNotifications() {
        try {
            if (this.currentUser) {
                const db = firebase.firestore();
                const userType = this.currentUser.type;
                const collectionName = userType === 'fortune-teller' ? 'fortune-tellers' : 'clients';

                await db.collection(collectionName).doc(this.currentUser.uid).set({
                    notificationsEnabled: false
                }, { merge: true });

                console.log('通知を無効化しました');
            }
        } catch (error) {
            console.error('通知無効化エラー:', error);
        }
    }
}

// グローバルインスタンス
window.notificationManager = new NotificationManager();

// 使用例:
// await window.notificationManager.initialize(messaging, currentUser);
// await window.notificationManager.requestPermission();
