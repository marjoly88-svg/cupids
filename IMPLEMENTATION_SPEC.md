# キューピッズ - 追加機能実装仕様書

## 実装する機能

### 1. 占い師プロフィール画像アップロード（Firebase Storage）

**実装場所:** `cupids-fortune-lobby.html` または `cupids-profile-edit.html`

**機能:**
- プロフィール編集画面に画像アップロードボタン追加
- 画像選択 → Firebase Storageにアップロード → URLをFirestoreに保存
- アップロード先: `fortune-tellers/{uid}/profile.jpg`

**コード例:**
```javascript
async function uploadProfileImage(file) {
  const storage = window.firebaseStorage;
  const storageRef = window.firebaseStorageRef(storage, `fortune-tellers/${currentUser.uid}/profile.jpg`);
  
  await window.firebaseUploadBytes(storageRef, file);
  const downloadURL = await window.firebaseGetDownloadURL(storageRef);
  
  // FirestoreのprofileImageURLを更新
  await window.firebaseUpdateDoc(
    window.firebaseDoc(window.firebaseDB, 'fortuneTellers', currentUser.uid),
    { profileImageURL: downloadURL }
  );
}
```

---

### 2. 管理画面: ダミー設定・メール通知設定

**実装場所:** `cupids-admin.html` の占い師一覧テーブル

**追加カラム:**
- `isDummy` (boolean) - ダミー占い師フラグ
- `notifyEmail` (boolean) - メール通知ON/OFF

**UI追加:**
```html
<td>
  <label class="toggle-switch">
    <input type="checkbox" 
           onchange="updateDummyStatus('${ft.id}', this.checked)"
           ${ft.isDummy ? 'checked' : ''}>
    <span class="toggle-slider"></span>
  </label>
  <span>${ft.isDummy ? 'ダミー' : '実占い師'}</span>
</td>

<td>
  <label class="toggle-switch">
    <input type="checkbox" 
           onchange="updateNotifyStatus('${ft.id}', this.checked)"
           ${ft.notifyEmail ? 'checked' : ''}>
    <span class="toggle-slider"></span>
  </label>
  <span>${ft.notifyEmail ? '通知ON' : '通知OFF'}</span>
</td>

<td>
  <button onclick="loginAsFortuneTeller('${ft.id}', '${ft.name}')"
          class="${ft.isDummy ? 'btn-dummy' : 'btn-impersonate'}">
    ${ft.isDummy ? '✅ この占い師として活動' : '⚠️ なりすまし'}
  </button>
</td>
```

**JavaScript関数:**
```javascript
async function updateDummyStatus(ftId, isDummy) {
  const ftRef = window.firebaseDoc(window.firebaseDB, 'fortuneTellers', ftId);
  await window.firebaseUpdateDoc(ftRef, { isDummy: isDummy });
  alert(isDummy ? 'ダミー占い師に設定しました' : 'ダミー設定を解除しました');
}

async function updateNotifyStatus(ftId, notifyEmail) {
  const ftRef = window.firebaseDoc(window.firebaseDB, 'fortuneTellers', ftId);
  await window.firebaseUpdateDoc(ftRef, { notifyEmail: notifyEmail });
  alert(notifyEmail ? 'メール通知をONにしました' : 'メール通知をOFFにしました');
}

function loginAsFortuneTeller(ftId, ftName) {
  if (confirm(`${ftName} としてログインしますか？\nこの操作は記録されます。`)) {
    // localStorageを書き換えて占い師としてログイン
    localStorage.setItem('currentUser', JSON.stringify({
      uid: ftId,
      type: 'fortune-teller',
      name: ftName,
      _impersonatedBy: 'admin'  // なりすましフラグ
    }));
    
    window.location.href = 'cupids-fortune-lobby.html';
  }
}
```

---

### 3. 占い師ダッシュボード: メール通知設定

**実装場所:** `cupids-fortune-lobby.html` に設定モーダルまたは設定ページ追加

**UI:**
```html
<div class="settings-section">
  <h3>通知設定</h3>
  <label>
    <input type="checkbox" id="emailNotify" 
           onchange="saveNotificationSettings(this.checked)">
    新規チャットをメールで通知する
  </label>
  <p class="note">
    通知先: <span id="notifyEmail">loading...</span><br>
    ※メールアドレスは登録情報から自動設定されます
  </p>
</div>
```

**JavaScript:**
```javascript
async function loadNotificationSettings() {
  const ftRef = window.firebaseDoc(window.firebaseDB, 'fortuneTellers', currentUser.uid);
  const ftDoc = await window.firebaseGetDoc(ftRef);
  
  if (ftDoc.exists()) {
    const data = ftDoc.data();
    document.getElementById('emailNotify').checked = data.notifyEmail || false;
    document.getElementById('notifyEmail').textContent = data.email;
  }
}

async function saveNotificationSettings(notifyEmail) {
  const ftRef = window.firebaseDoc(window.firebaseDB, 'fortuneTellers', currentUser.uid);
  await window.firebaseUpdateDoc(ftRef, { notifyEmail: notifyEmail });
  alert(notifyEmail ? 'メール通知をONにしました' : 'メール通知をOFFにしました');
}
```

---

### 4. Firebase Functions デプロイ

**必要な作業:**

1. **Firebase CLIインストール**
   ```bash
   npm install -g firebase-tools
   ```

2. **ログインとプロジェクト選択**
   ```bash
   firebase login
   firebase use cupids-chat
   ```

3. **環境変数設定**
   ```bash
   firebase functions:config:set email.user="your-gmail@gmail.com"
   firebase functions:config:set email.pass="your-app-password"
   firebase functions:config:set admin.email="shoko@example.com"
   ```

4. **デプロイ**
   ```bash
   firebase deploy --only functions
   ```

---

## Firestoreデータ構造の変更

### fortuneTellers コレクション

既存フィールドに追加:
```javascript
{
  // 既存フィールド
  uid: string,
  name: string,
  email: string,
  // ... その他

  // 新規追加フィールド
  isDummy: boolean,           // ダミー占い師フラグ（デフォルト: false）
  notifyEmail: boolean,       // メール通知ON/OFF（デフォルト: false）
  profileImageURL: string     // プロフィール画像URL（オプション）
}
```

---

## テスト手順

### 1. プロフィール画像アップロードのテスト
1. 占い師としてログイン
2. プロフィール編集画面
3. 画像を選択してアップロード
4. 画像が表示されることを確認

### 2. ダミー設定のテスト
1. 管理画面にログイン
2. 占い師一覧でダミーをON
3. その占い師としてログイン
4. お客様側から新規チャット開始
5. メールが届くか確認

### 3. なりすましログインのテスト
1. 管理画面で「この占い師として活動」クリック
2. 占い師ロビーに遷移
3. チャット対応できることを確認
4. ログアウト後、管理画面に戻る

---

## セキュリティ注意事項

1. **なりすましログインの記録**
   - localStorageに`_impersonatedBy: 'admin'`フラグを保存
   - 必要に応じてFirestoreにログを記録

2. **Firebase Security Rules**
   ```javascript
   // fortuneTellers/{uid}
   allow read: if true;  // 誰でも読める（プロフィール表示用）
   allow write: if request.auth.uid == resource.data.uid 
                || hasRole('admin');  // 本人または管理者のみ更新可
   
   // Storage: fortune-tellers/{uid}/profile.jpg
   allow write: if request.auth.uid == uid;  // 本人のみアップロード可
   allow read: if true;  // 誰でも閲覧可
   ```

---

## 今後の拡張案

- [ ] LINE通知（LINE Notify API）
- [ ] プッシュ通知（FCM）
- [ ] 既読・未読機能
- [ ] チャット画面開いている時は通知しない機能
- [ ] 通知頻度制限（10分に1回まで等）
