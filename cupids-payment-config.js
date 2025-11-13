// Square決済設定ファイル
// cupids-payment-config.js

/**
 * Square決済環境設定
 * 本番環境に切り替える場合は、ENVIRONMENT を 'production' に変更し、
 * 本番用のアプリケーションIDとロケーションIDを設定してください
 */

const PAYMENT_CONFIG = {
    // 環境設定: 'sandbox' または 'production'
    ENVIRONMENT: 'sandbox',  // TODO: 本番環境では 'production' に変更
    
    // サンドボックス設定（テスト環境）
    SANDBOX: {
        applicationId: 'sandbox-sq0idb-E7F0J3N84TT8_A0v_yX6tA',  // 現在の設定
        locationId: 'LBQY6HGKT7V2Z',  // 現在の設定
        webhookSignatureKey: ''  // 必要に応じて設定
    },
    
    // 本番環境設定
    PRODUCTION: {
        applicationId: '',  // TODO: Square本番アプリケーションIDを入力
        locationId: '',     // TODO: Square本番ロケーションIDを入力
        webhookSignatureKey: ''  // TODO: Webhook署名キーを入力（オプション）
    }
};

/**
 * 現在の環境に応じた設定を取得
 */
function getSquareConfig() {
    const env = PAYMENT_CONFIG.ENVIRONMENT;
    const config = env === 'production' ? 
        PAYMENT_CONFIG.PRODUCTION : 
        PAYMENT_CONFIG.SANDBOX;
    
    // 本番環境で設定が不足している場合は警告
    if (env === 'production' && (!config.applicationId || !config.locationId)) {
        console.error('⚠️ 本番環境のSquare設定が不完全です。applicationIdとlocationIdを設定してください。');
        // フォールバックとしてサンドボックスを使用
        return PAYMENT_CONFIG.SANDBOX;
    }
    
    return config;
}

/**
 * Square決済の初期化
 * HTMLファイルで使用する場合の例:
 * 
 * <script src="cupids-payment-config.js"></script>
 * <script>
 *     const squareConfig = getSquareConfig();
 *     const payments = Square.payments(squareConfig.applicationId, squareConfig.locationId);
 * </script>
 */

// 設定変更手順
const SETUP_INSTRUCTIONS = `
===========================================
Square決済の本番環境設定手順
===========================================

1. Squareダッシュボードにログイン
   https://squareup.com/dashboard

2. アプリケーション設定から本番用のクレデンシャルを取得
   - Application ID をコピー
   - Location ID をコピー

3. このファイルを編集
   - ENVIRONMENT を 'production' に変更
   - PRODUCTION セクションに取得したIDを設定
   
4. 全HTMLファイルの Square.payments() 呼び出しを確認
   特に cupids-purchase.html の設定を更新

5. テスト決済を実行して動作確認

注意事項:
- 本番環境では実際の決済が発生します
- テストカード番号は使用できません
- SSL証明書（HTTPS）が必須です

テスト用カード番号（サンドボックスのみ）:
- 4111 1111 1111 1111 (Visa)
- 5105 1051 0510 5100 (Mastercard)
- CVV: 任意の3桁
- 有効期限: 未来の任意の日付
===========================================
`;

// Node.js環境での使用（Firebase Functions等）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSquareConfig,
        PAYMENT_CONFIG
    };
}
