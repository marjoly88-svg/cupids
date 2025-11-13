# キューピッズ - セットアップ手順書

## 🚀 初期設定手順

### 1. Firebase Functions設定（メール通知機能）

#### 1-1. Firebase CLIのインストール
```bash
npm install -g firebase-tools
```

#### 1-2. Firebaseにログイン
```bash
firebase login
```

#### 1-3. プロジェクトディレクトリで初期化
```bash
firebase init functions
# プロジェクト選択: cupids-chat を選択
# 言語選択: JavaScript を選択
```

#### 1-4. functionsディレクトリに移動して依存関係インストール
```bash
cd functions
npm install
```

#### 1-5. Gmail設定（メール送信用）
1. Googleアカウントで「アプリパスワード」を生成
   - https://myaccount.google.com/security
   - 2段階認証を有効化
   - 「アプリパスワード」を生成

2. Firebase設定にメール情報を登録
```bash
firebase functions:config:set email.user="your-gmail@gmail.com"
firebase functions:config:set email.pass="your-app-password"
firebase functions:config:set admin.email="admin@example.com"
```

#### 1-6. Functionsをデプロイ
```bash
firebase deploy --only functions
```

### 2. Square決済の本番環境設定

#### 2-1. Squareアカウント設定
1. [Square Dashboard](https://squareup.com/dashboard) にログイン
2. 「アプリケーション」→「認証情報」から本番環境の情報を取得
   - Production Application ID
   - Production Location ID

#### 2-2. 設定ファイルの更新
`cupids-payment-config.js` を編集:
```javascript
ENVIRONMENT: 'production',  // 変更
PRODUCTION: {
    applicationId: 'YOUR_PROD_APP_ID',  // 実際のIDを入力
    locationId: 'YOUR_PROD_LOCATION_ID'  // 実際のIDを入力
}
```

#### 2-3. HTMLファイルの更新
`cupids-purchase.html` 内の Square 初期化コードを確認・更新

### 3. 文字化けファイルの修正
すでに修正済みのファイル:
- ✅ cupids-password-reset.html
- ✅ cupids-block-list.html

### 4. Firebase Security Rules設定

#### 4-1. Firestoreルール
`firestore.rules` ファイルを作成:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // お客様コレクション
    match /clients/{clientId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == clientId;
    }
    
    // 占い師コレクション
    match /fortuneTellers/{fortuneTellerId} {
      allow read: if true;  // プロフィール表示用
      allow write: if request.auth.uid == fortuneTellerId 
                   || get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // 会話コレクション
    match /conversations/{conversationId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      
      // メッセージサブコレクション
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null;
      }
    }
    
    // 管理者コレクション
    match /admins/{adminId} {
      allow read: if request.auth.uid == adminId;
      allow write: if false;  // 手動でのみ設定
    }
  }
}
```

#### 4-2. Storage ルール
`storage.rules` ファイルを作成:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 占い師プロフィール画像
    match /fortune-tellers/{fortuneTellerId}/profile.jpg {
      allow read: if true;
      allow write: if request.auth.uid == fortuneTellerId;
    }
    
    // チャット画像
    match /chats/{conversationId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. 環境変数設定（.env.local）
```env
# Firebase設定（すでにHTMLに記載済み）
VITE_FIREBASE_API_KEY=AIzaSyA52uJ31HzLkbz32lA-3WWSmhM10xYjjCg
VITE_FIREBASE_AUTH_DOMAIN=cupids-chat.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cupids-chat

# Square決済（本番環境）
SQUARE_APPLICATION_ID=your_production_app_id
SQUARE_LOCATION_ID=your_production_location_id
```

## 📝 チェックリスト

### 必須設定
- [ ] Firebase Functions設定完了
- [ ] メール送信用Gmailアカウント設定
- [ ] Square本番環境クレデンシャル取得
- [ ] cupids-payment-config.js更新
- [ ] Firebase Security Rules設定
- [ ] SSL証明書設定（HTTPS必須）

### 推奨設定
- [ ] カスタムドメイン設定
- [ ] Google Analytics設定
- [ ] バックアップ設定
- [ ] 監視・アラート設定

## 🧪 動作テスト手順

### 1. 基本機能テスト
1. お客様新規登録
2. 占い師ログイン
3. ポイント購入（テスト決済）
4. チャット開始
5. メッセージ送受信
6. レビュー投稿

### 2. メール通知テスト
1. 占い師の通知設定をON
2. 新規チャット開始
3. メール受信確認

### 3. 管理機能テスト
1. 管理画面ログイン
2. 売上データ確認
3. 占い師管理機能

## ⚠️ 注意事項

### セキュリティ
- 本番環境では必ずHTTPSを使用
- Firebase APIキーは公開リポジトリにコミットしない
- 管理者権限は最小限に

### 決済
- 本番環境では実際の決済が発生
- テストは必ずサンドボックス環境で
- 返金処理は手動対応

### バックアップ
- Firestoreの自動バックアップ設定推奨
- 定期的なデータエクスポート

## 📞 サポート

技術的な問題が発生した場合:
1. Firebase Console のログを確認
2. ブラウザの開発者コンソールを確認
3. Firebase Functions のログを確認: `firebase functions:log`

## 更新履歴
- 2025/11/13: 初版作成
- 文字化け修正完了
- Firebase Functions追加
- Square決済設定追加
