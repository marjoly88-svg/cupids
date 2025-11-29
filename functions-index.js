const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Client, Environment } = require('square');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// Square Client初期化
const squareClient = new Client({
  environment: Environment.Sandbox, // 本番環境では Environment.Production に変更
  accessToken: functions.config().square.access_token,
});

/**
 * Square決済用のCheckout URLを生成
 * POST /createCheckout
 * Body: { userId, amount, points }
 */
exports.createCheckout = functions.https.onRequest(async (req, res) => {
  // ★CORSヘッダーを毎回つける
  res.set('Access-Control-Allow-Origin', 'https://cupids-seven.vercel.app');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // ★ブラウザのプリフライト(OPTIONS)用
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, amount, points } = req.body;

    if (!userId || !amount || !points) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const locationId = functions.config().square.location_id;

    const response = await squareClient.checkoutApi.createPaymentLink({
      idempotencyKey: `${userId}-${Date.now()}`,
      quickPay: {
        name: `キューピッズ ${points}ポイント`,
        priceMoney: {
          amount: BigInt(amount), // 金額(円)をそのままBigIntで送る
          currency: 'JPY',
        },
        locationId: locationId,
      },
      checkoutOptions: {
        redirectUrl: `https://cupids-seven.vercel.app/purchase.html?success=true`,
        askForShippingAddress: false,
      },
      prePopulatedData: {
        buyerEmail: '',
      },
      note: JSON.stringify({
        userId,
        points,
        timestamp: Date.now(),
      }),
    });

    const checkoutUrl = response.result.paymentLink.url;

    return res.json({
      success: true,
      checkoutUrl,
    });
  } catch (error) {
    console.error('Square Checkout作成エラー:', error);
    return res.status(500).json({
      error: 'Checkout作成に失敗しました',
      details: error.message,
    });
  }
});


/**
 * Square Webhook - 決済完了時に自動でポイント付与
 * POST /squareWebhook
 */
exports.squareWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const { type, data } = req.body;

    console.log('Webhook受信:', type);

    // 決済完了イベントのみ処理
    if (type === 'payment.created' || type === 'payment.updated') {
      const payment = data.object.payment;

      // 決済が完了（COMPLETED）の場合のみポイント付与
      if (payment.status === 'COMPLETED') {
        
        // noteからユーザー情報を取得
        let metadata;
        try {
          metadata = JSON.parse(payment.note || '{}');
        } catch (e) {
          console.error('Note解析エラー:', e);
          return res.status(200).send('OK');
        }

        const { userId, points } = metadata;

        if (!userId || !points) {
          console.error('メタデータ不足:', metadata);
          return res.status(200).send('OK');
        }

        // Firestoreでポイント付与
        const db = admin.firestore();
        const userRef = db.collection('users').doc(userId);

        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          
          if (!userDoc.exists) {
            throw new Error('ユーザーが見つかりません');
          }

          const currentPoints = userDoc.data().points || 0;
          const newPoints = currentPoints + points;

          // ポイント更新
          transaction.update(userRef, {
            points: newPoints,
            lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // 購入履歴を記録
          const purchaseRef = db.collection('purchases').doc();
          transaction.set(purchaseRef, {
            userId: userId,
            amount: parseInt(payment.totalMoney.amount) / 100, // セントから円に変換
            points: points,
            paymentId: payment.id,
            status: 'completed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        console.log(`ポイント付与成功: ${userId} に ${points}pt`);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook処理エラー:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * テスト用: 手動ポイント付与
 * POST /addPointsManually
 * Body: { userId, points, adminKey }
 */
exports.addPointsManually = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { userId, points, adminKey } = req.body;

      // 簡易的な管理者認証
      if (adminKey !== functions.config().admin.key) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      if (!userId || !points) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const db = admin.firestore();
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const currentPoints = userDoc.data().points || 0;
      const newPoints = currentPoints + parseInt(points);

      await userRef.update({
        points: newPoints,
        lastManualAddAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        userId: userId,
        addedPoints: points,
        newTotal: newPoints,
      });

    } catch (error) {
      console.error('手動ポイント付与エラー:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * メッセージ作成時に占い師へ通知を送る（6時間制限付き）
 * Firestore Trigger: messages/{messageId} onCreate
 */
exports.notifyFortuneTellerOnMessage = functions.firestore
  .document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    try {
      const message = snap.data();
      const messageId = context.params.messageId;

      // お客様からのメッセージのみ処理
      if (message.senderType !== 'client') {
        console.log('占い師からのメッセージなのでスキップ');
        return null;
      }

      const db = admin.firestore();

      // 会話情報を取得
      const conversationRef = db.collection('conversations').doc(message.conversationId);
      const conversationSnap = await conversationRef.get();

      if (!conversationSnap.exists) {
        console.error('会話が見つかりません:', message.conversationId);
        return null;
      }

      const conversation = conversationSnap.data();
      const fortuneTellerId = conversation.fortuneTellerId;

      // 占い師情報を取得
      const fortuneTellerRef = db.collection('fortuneTellers').doc(fortuneTellerId);
      const fortuneTellerSnap = await fortuneTellerRef.get();

      if (!fortuneTellerSnap.exists) {
        console.error('占い師が見つかりません:', fortuneTellerId);
        return null;
      }

      const fortuneTeller = fortuneTellerSnap.data();

      // 通知が有効か確認
      if (!fortuneTeller.notificationsEnabled) {
        console.log('占い師が通知を無効にしています');
        return null;
      }

      // FCMトークンがあるか確認
      if (!fortuneTeller.fcmToken) {
        console.log('FCMトークンがありません');
        return null;
      }

      // 6時間制限チェック
      const lastNotificationSentAt = fortuneTeller.lastNotificationSentAt;
      const now = admin.firestore.Timestamp.now();
      const sixHoursInMillis = 6 * 60 * 60 * 1000; // 6時間

      if (lastNotificationSentAt) {
        const timeSinceLastNotification = now.toMillis() - lastNotificationSentAt.toMillis();
        
        if (timeSinceLastNotification < sixHoursInMillis) {
          console.log('6時間以内に通知済みなのでスキップ');
          return null;
        }
      }

      // お客様の名前を取得
      const clientRef = db.collection('users').doc(conversation.clientId);
      const clientSnap = await clientRef.get();
      const clientName = clientSnap.exists ? (clientSnap.data().name || 'お客様') : 'お客様';

      // プッシュ通知を送信
      const payload = {
        notification: {
          title: '新しいメッセージ',
          body: `${clientName}さんから相談が届きました`,
        },
        data: {
          type: 'new_message',
          conversationId: message.conversationId,
          userType: 'fortune-teller',
          messageId: messageId,
        },
        token: fortuneTeller.fcmToken,
      };

      await admin.messaging().send(payload);
      console.log('通知送信成功:', fortuneTellerId);

      // 最後に通知を送った時刻を更新
      await fortuneTellerRef.update({
        lastNotificationSentAt: now,
      });

      return null;

    } catch (error) {
      console.error('通知送信エラー:', error);
      return null;
    }
  });

