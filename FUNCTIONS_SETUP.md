# 🔥 Firebase Functions セットアップ手順

## 📋 概要
自動ポイント付与システムを動かすために、Firebase Cloud Functionsをセットアップします。

---

## 1️⃣ Firebase CLIをインストール

```bash
npm install -g firebase-tools
```

---

## 2️⃣ Firebaseにログイン

```bash
firebase login
```

---

## 3️⃣ プロジェクトを初期化

```bash
cd your-project-directory
firebase init functions
```

**質問に答える:**
- プロジェクトを選択: `cupids-chat`
- 言語: `JavaScript`
- ESLint: `No` (お好みで)
- 依存関係をインストール: `Yes`

---

## 4️⃣ functionsフォルダの中身を置き換え

1. `functions/index.js` を上書き
2. `functions/package.json` を上書き

---

## 5️⃣ Square APIキーを環境変数に設定

```bash
firebase functions:config:set square.access_token="YOUR_SQUARE_ACCESS_TOKEN"
firebase functions:config:set square.location_id="YOUR_LOCATION_ID"
```

**Square Access Tokenの取得方法:**
1. Square Developer Dashboard: https://developer.squareup.com/
2. Applications → あなたのアプリを選択
3. Credentials タブ
4. Sandbox Access Token (テスト用) または Production Access Token (本番用)
5. Location ID も同じページにあります

---

## 6️⃣ Functionsをデプロイ

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

デプロイが完了すると、以下のURLが表示されます:
```
✔  functions[createCheckout(us-central1)]: https://us-central1-cupids-chat.cloudfunctions.net/createCheckout
✔  functions[squareWebhook(us-central1)]: https://us-central1-cupids-chat.cloudfunctions.net/squareWebhook
```

---

## 7️⃣ Square WebhookをSquare Developer Dashboardで設定

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

## 8️⃣ purchase.htmlのFunctions URLを確認

`purchase.html` の中の以下の部分が、デプロイしたURLと一致しているか確認:

```javascript
const response = await fetch('https://us-central1-cupids-chat.cloudfunctions.net/createCheckout', {
```

---

## 9️⃣ テスト

1. サイトでポイント購入ボタンをクリック
2. Square決済ページが開く
3. テストカードで決済:
   - カード番号: `4111 1111 1111 1111`
   - CVV: `111`
   - 有効期限: 未来の日付
4. 決済完了後、自動的にポイントが付与される

---

## 🔟 本番環境に切り替える

**index.jsの環境を変更:**

```javascript
const squareClient = new Client({
  environment: Environment.Production, // ← ここを変更
  accessToken: functions.config().square.access_token,
});
```

**本番用のSquare Access Tokenを設定:**

```bash
firebase functions:config:set square.access_token="YOUR_PRODUCTION_ACCESS_TOKEN"
firebase functions:config:set square.location_id="YOUR_PRODUCTION_LOCATION_ID"
```

**再デプロイ:**

```bash
firebase deploy --only functions
```

---

## 🛠️ トラブルシューティング

### エラー: "CORS policy"
→ Functions の `createCheckout` にCORSヘッダーが設定されているか確認

### Webhookが届かない
→ Square Dashboard の Webhooks設定で、URLが正しいか確認
→ Firebase Functions のログを確認: `firebase functions:log`

### ポイントが付与されない
→ Firebase Functionsのログを確認
→ payment.note の形式が正しいか確認

---

## 📊 ログの確認方法

```bash
# リアルタイムでログを監視
firebase functions:log --only createCheckout,squareWebhook

# または Firebase Consoleで確認
# https://console.firebase.google.com/ → Functions → ログ
```

---

## ✅ 完成！

これで、お客様が購入したら自動でポイントが付与される仕組みが完成です🎉

- ✅ チャージコード不要
- ✅ Zapier不要（固定費0円）
- ✅ リアルタイムでポイント反映
- ✅ プロの占いサイトと同じ方式

---

作成日: 2025年1月
プロジェクト: キューピッズ（Cupids）
