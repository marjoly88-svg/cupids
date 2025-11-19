# 🚀 Firebase Functions デプロイ手順

## 📋 前提条件
- Node.js 18以上がインストール済み
- Firebase CLIがインストール済み（`npm install -g firebase-tools`）
- Squareアカウントがある
- Firebase Blazeプラン（従量課金）に登録済み

---

## 1️⃣ Firebase CLIのインストール

```bash
npm install -g firebase-tools
```

---

## 2️⃣ Firebaseにログイン

```bash
firebase login
```

ブラウザが開くので、Googleアカウントでログインしてください。

---

## 3️⃣ Firebaseプロジェクトを初期化

```bash
cd your-project-directory
firebase init functions
```

**質問に答える:**
- プロジェクトを選択: `cupids-chat`
- 言語: `JavaScript`
- ESLint: `No`
- 依存関係をインストール: `Yes`

---

## 4️⃣ Functionsフォルダにファイルを配置

1. `functions/package.json` を `functions-package.json` の内容で置き換え
2. `functions/index.js` を `functions-index.js` の内容で置き換え

```bash
cd functions
# package.jsonとindex.jsを配置
```

---

## 5️⃣ Square APIキーを環境変数に設定

### Sandbox（テスト環境）の場合:

```bash
firebase functions:config:set square.access_token="YOUR_SANDBOX_ACCESS_TOKEN"
firebase functions:config:set square.location_id="YOUR_SANDBOX_LOCATION_ID"
firebase functions:config:set admin.key="YOUR_ADMIN_SECRET_KEY"
```

### 本番環境の場合:

```bash
firebase functions:config:set square.access_token="YOUR_PRODUCTION_ACCESS_TOKEN"
firebase functions:config:set square.location_id="YOUR_PRODUCTION_LOCATION_ID"
firebase functions:config:set admin.key="YOUR_ADMIN_SECRET_KEY"
```

**Square Access Tokenの取得方法:**
1. Square Developer Dashboard: https://developer.squareup.com/
2. Applications → あなたのアプリを選択
3. Credentials タブ
4. Sandbox Access Token（テスト用）または Production Access Token（本番用）をコピー
5. Location IDも同じページにあります

**Admin Keyの設定:**
- 任意の秘密鍵を設定してください（例: `cupids_admin_2025_secret`）
- 手動ポイント付与APIで使用します

---

## 6️⃣ 環境変数の確認

```bash
firebase functions:config:get
```

以下のように表示されればOK:
```json
{
  "square": {
    "access_token": "EAAxxxxx...",
    "location_id": "LBQxxxxx..."
  },
  "admin": {
    "key": "your_secret_key"
  }
}
```

---

## 7️⃣ Functionsをデプロイ

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

デプロイが完了すると、以下のURLが表示されます:
```
✔  functions[createCheckout]: https://us-central1-cupids-chat.cloudfunctions.net/createCheckout
✔  functions[squareWebhook]: https://us-central1-cupids-chat.cloudfunctions.net/squareWebhook
✔  functions[addPointsManually]: https://us-central1-cupids-chat.cloudfunctions.net/addPointsManually
```

**これらのURLをメモしておいてください！**

---

## 8️⃣ Square WebhookをSquare Developer Dashboardで設定

1. Square Developer Dashboard: https://developer.squareup.com/
2. あなたのアプリを選択
3. 左メニュー「Webhooks」をクリック
4. 「Add subscription」をクリック
5. 以下を設定:
   - **URL**: `https://us-central1-cupids-chat.cloudfunctions.net/squareWebhook`
   - **Events**: 
     - ✅ `payment.created`
     - ✅ `payment.updated`
6. 「Save」をクリック

---

## 9️⃣ purchase.htmlを更新

`purchase.html` の購入処理を更新して、Firebase Functionsを呼び出すようにします。

**変更箇所:**

```javascript
// 古いコード（Square決済ページへ直接リンク）
const squareUrl = `https://minamisan.square.site/`;
window.open(squareUrl, '_blank');

// 新しいコード（Firebase Functionsで決済リンク生成）
const response = await fetch('https://us-central1-cupids-chat.cloudfunctions.net/createCheckout', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        userId: currentUser.uid,
        amount: price * 100, // 円をセントに変換
        points: points
    })
});

const data = await response.json();
if (data.success) {
    window.open(data.checkoutUrl, '_blank');
}
```

---

## 🔟 テスト

### A. Square決済テスト（Sandbox）

1. サイトでポイント購入ボタンをクリック
2. Square決済ページが開く
3. テストカードで決済:
   - **カード番号**: `4111 1111 1111 1111`
   - **CVV**: `111`
   - **有効期限**: 未来の任意の日付（例: 12/30）
   - **郵便番号**: `12345`
4. 決済完了後、自動的にポイントが付与される

### B. Firebase Functionsログ確認

```bash
firebase functions:log
```

または Firebase Console → Functions → ログ

### C. 手動ポイント付与テスト

```bash
curl -X POST https://us-central1-cupids-chat.cloudfunctions.net/addPointsManually \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-client-001",
    "points": 1000,
    "adminKey": "YOUR_ADMIN_SECRET_KEY"
  }'
```

---

## 1️⃣1️⃣ 本番環境に切り替える

### A. functions/index.jsの環境を変更

```javascript
const squareClient = new Client({
  environment: Environment.Production, // ← Sandboxから変更
  accessToken: functions.config().square.access_token,
});
```

### B. 本番用のSquare Access Tokenを設定

```bash
firebase functions:config:set square.access_token="YOUR_PRODUCTION_ACCESS_TOKEN"
firebase functions:config:set square.location_id="YOUR_PRODUCTION_LOCATION_ID"
```

### C. 再デプロイ

```bash
firebase deploy --only functions
```

### D. Square Webhookを更新

本番環境のWebhook URLを設定し直してください。

---

## 🛠️ トラブルシューティング

### エラー: "CORS policy"
→ functions/index.js に CORS設定があるか確認

### Webhookが届かない
→ Square Dashboard の Webhooks設定で、URLが正しいか確認
→ Firebase Functions のログを確認: `firebase functions:log`

### ポイントが付与されない
→ Firebase Functionsのログを確認
→ payment.note の形式が正しいか確認
→ Square Webhookが正しく設定されているか確認

### デプロイエラー: "Billing account not configured"
→ Firebase ConsoleでBlazeプラン（従量課金）に登録する必要があります
→ https://console.firebase.google.com/ → プロジェクト設定 → 使用量と請求

---

## 📊 ログの確認方法

### リアルタイムでログを監視
```bash
firebase functions:log --only createCheckout,squareWebhook
```

### または Firebase Consoleで確認
https://console.firebase.google.com/ → Functions → ログ

---

## ✅ 完成！

これで、お客様が購入したら自動でポイントが付与される仕組みが完成です🎉

**メリット:**
- ✅ チャージコード不要
- ✅ Zapier不要（固定費0円）
- ✅ リアルタイムでポイント反映
- ✅ プロの占いサイトと同じ方式

---

**作成日**: 2025年1月
**プロジェクト**: キューピッズ（Cupids）
