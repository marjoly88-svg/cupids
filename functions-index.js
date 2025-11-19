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
exports.createCheckout = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { userId, amount, points } = req.body;

      if (!userId || !amount || !points) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Square Checkoutセッションを作成
      const locationId = functions.config().square.location_id;
      
      const response = await squareClient.checkoutApi.createPaymentLink({
        idempotencyKey: `${userId}-${Date.now()}`,
        quickPay: {
          name: `キューピッズ ${points}ポイント`,
          priceMoney: {
            amount: BigInt(amount),
            currency: 'JPY',
          },
          locationId: locationId,
        },
        checkoutOptions: {
          redirectUrl: `https://cupids-seven.vercel.app/purchase.html?success=true`,
          askForShippingAddress: false,
        },
        // メタデータにユーザー情報を保存
        prePopulatedData: {
          buyerEmail: '',
        },
        note: JSON.stringify({
          userId: userId,
          points: points,
          timestamp: Date.now(),
        }),
      });

      const checkoutUrl = response.result.paymentLink.url;
      
      res.json({
        success: true,
        checkoutUrl: checkoutUrl,
      });

    } catch (error) {
      console.error('Square Checkout作成エラー:', error);
      res.status(500).json({ 
        error: 'Checkout作成に失敗しました',
        details: error.message 
      });
    }
  });
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
        const userRef = db.collection('clients').doc(userId);

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
      const userRef = db.collection('clients').doc(userId);
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
