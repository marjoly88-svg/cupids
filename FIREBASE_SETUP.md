# 🔥 キューピッズ Firebase設定手順

## 📋 必要な設定一覧
1. ✅ Firestore Database（セキュリティルール）
2. ✅ Authentication（メール認証）
3. ✅ Cloud Messaging（プッシュ通知）
4. ⚠️ Hosting（デプロイ）※VercelでOK

---

## 1️⃣ Firestore Databaseの設定

### A. Firestoreを有効化
1. Firebase Console → https://console.firebase.google.com/
2. プロジェクト「cupids-chat」を選択
3. 左メニュー「Firestore Database」をクリック
4. 「データベースの作成」をクリック
5. ロケーション：`asia-northeast1 (Tokyo)` を選択
6. 「本番環境モード」で開始 → 「次へ」→「有効にする」

### B. セキュリティルールを設定
1. Firestore Database → 「ルール」タブ
2. 以下の内容を貼り付け：

```
（firestore.rulesの内容をコピペ）
```

3. 「公開」ボタンをクリック

### C. インデックスを作成（必要に応じて）
- 複雑なクエリでエラーが出た時、Firebase Consoleが自動でリンクを表示
- そのリンクをクリックすれば自動作成される

---

## 2️⃣ Authenticationの設定

### A. 認証を有効化
1. Firebase Console → 「Authentication」
2. 「始める」をクリック
3. 「Sign-in method」タブ

### B. メール/パスワード認証を有効化
1. 「メール/パスワード」をクリック
2. 「有効にする」をONに
3. 「保存」

### C. 許可するドメインを追加（Vercelのドメイン）
1. 「Settings」タブ
2. 「承認済みドメイン」セクション
3. Vercelのドメインを追加：
   - 例：`your-app-name.vercel.app`
   - カスタムドメインがあれば追加

---

## 3️⃣ Cloud Messaging（プッシュ通知）の設定

### A. Web Push証明書（VAPID Key）を取得
1. Firebase Console → 「プロジェクトの設定」（歯車アイコン）
2. 「Cloud Messaging」タブ
3. 下にスクロールして「ウェブプッシュ証明書」セクション
4. 「鍵ペアを生成」ボタンをクリック
5. 表示されたキー（長い文字列）をコピー

### B. コードに反映
`notification-manager.js` の 68行目を編集：

```javascript
vapidKey: 'あなたのVAPIDキーをここに貼り付け',
```

例：
```javascript
vapidKey: 'BH7xK3...(長い文字列)...xyz',
```

---

## 4️⃣ Firebase Hostingの設定（オプション - Vercel使用の場合は不要）

Vercelを使っているので、Firebase Hostingは不要です。
ただし、Cloud Functionsを使う場合は設定が必要になります。

---

## 5️⃣ デプロイ前のチェックリスト

### ✅ Firebase Console確認
- [ ] Firestoreが有効化されている
- [ ] セキュリティルールが設定されている
- [ ] Authentication（メール/パスワード）が有効
- [ ] 承認済みドメインにVercelドメインを追加
- [ ] VAPID Keyを取得済み

### ✅ コード修正確認
- [ ] notification-manager.js にVAPID Keyを設定
- [ ] すべてのHTMLファイルのFirebase設定が正しい
  ```javascript
  const firebaseConfig = {
    apiKey: "AIzaSyA52uJ31HzLkbz32lA-3WWSmhM10xYjjCg",
    authDomain: "cupids-chat.firebaseapp.com",
    projectId: "cupids-chat",
    storageBucket: "cupids-chat.firebasestorage.app",
    messagingSenderId: "44532110483",
    appId: "1:44532110483:web:d6266e8abba8582b8b6966"
  };
  ```

### ✅ Square決済確認
- [ ] cupids-payment-config.js の設定確認
- [ ] サンドボックス/本番環境の切り替え確認

---

## 6️⃣ GitHubにアップロード → Vercelで自動デプロイ

1. GitHubリポジトリを開く
2. 既存ファイルを全削除（または新ブランチ作成）
3. 以下のファイルをアップロード：
   - 全HTMLファイル（21個）
   - 全JSファイル（3個）※VAPID Key設定後
   - manifest.json, firebase.json
   - 全画像ファイル（4個）
   - firestore.rules（参考用）
4. コミット → Vercelが自動デプロイ

---

## 🔧 トラブルシューティング

### エラー: "Missing or insufficient permissions"
→ Firestoreのセキュリティルールを確認

### エラー: "The domain is not authorized"
→ Firebase Authentication の承認済みドメインを確認

### プッシュ通知が届かない
→ VAPID Keyが正しく設定されているか確認
→ ブラウザで通知許可がされているか確認

### 決済が動かない
→ Square設定（applicationId, locationId）を確認
→ HTTPSで動作しているか確認（Vercelは自動でHTTPS）

---

## 📞 サポート

問題が解決しない場合：
1. Firebase Consoleのログを確認
2. ブラウザのコンソール（F12）でエラーを確認
3. Firestore、Authentication、Cloud Messagingのステータスを確認

---

## 🎉 完了！

全ての設定が完了したら、以下をテスト：
1. ✅ ユーザー登録・ログイン
2. ✅ 占い師プロフィール表示
3. ✅ チャット送受信
4. ✅ ポイント購入（サンドボックス）
5. ✅ プッシュ通知
6. ✅ レビュー投稿
7. ✅ 占い師ダッシュボード
8. ✅ 管理画面

---

作成日: 2025年1月
プロジェクト: キューピッズ（Cupids）
