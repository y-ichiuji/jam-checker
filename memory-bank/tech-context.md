# Jam Checker - 技術コンテキスト

## 使用技術

Jam Checkerの開発には、以下の技術スタックを使用しています：

### コアフレームワークとライブラリ

- **Angular 19.2.6**: メインフレームワーク
  - スタンドアロンコンポーネント
  - Angular Signal API
  - 依存性注入システム
  - コンポーネントルーター

- **TypeScript**: プログラミング言語
  - 静的型チェック
  - 最新のES機能
  - インターフェースとタイプエイリアス

- **RxJS**: リアクティブプログラミングライブラリ
  - 非同期データフローの管理
  - イベントストリームの操作
  - 効率的なデータ変換

### スタイリングとUI

- **Tailwind CSS 4.1.7**: ユーティリティファーストのCSSフレームワーク
  - レスポンシブデザイン
  - カスタマイズ可能なコンポーネント
  - パフォーマンス最適化

- **HTML5**: マークアップ言語
  - セマンティックなHTMLの使用
  - アクセシビリティ対応

### 開発ツール

- **Node.js**: JavaScriptランタイム
- **yarn**: パッケージ管理ツール
- **Angular CLI 19.2.7**: Angularプロジェクト管理ツール
- **ESLint 9.26.0**: コード品質チェックツール
- **Prettier 3.5.3**: コードフォーマッター

### テスト

- **Jasmine 5.2.0**: テストフレームワーク
- **Karma 6.4.0**: テストランナー
- **Angular Testing Utilities**: コンポーネントテスト用ユーティリティ
- **fakeAsync/tick**: 非同期テストのための推奨パターン

### ビルドとデプロイ

- **webpack**: モジュールバンドラー（Angular内部で使用）
- **GitHub Actions**: CI/CDパイプライン（将来実装予定）

## 開発環境セットアップ

### 必要条件

- .node-versionを参照
- yarn 2.x以上
- Git

### 環境構築手順

```bash
# リポジトリをクローン
git clone https://github.com/y-ichiuji/jam-checker.git
cd jam-checker

# 依存関係のインストール
yarn install

# 開発サーバーの起動
yarn start
```

### 開発サーバー

開発サーバーは `http://localhost:4201` で起動します。
ソースコードの変更を保存すると、アプリケーションは自動的にリロードされます。

### プロジェクトの構築

```bash
# プロダクションビルド
yarn build

# テストの実行
yarn test

# リントチェック
yarn lint
```

### 開発ワークフロー

1. **機能開発**:
   - 要件の確認
   - コンポーネント・サービスの設計
   - Presentational/Containerパターンに基づく実装
   - テストの作成（fakeAsync/tickを使用した非同期テスト）
   - コードレビュー

2. **コードレビュー**:
   - ESLintとPrettierによるコード品質チェック
   - テストカバレッジの確認
   - パフォーマンスの確認

3. **CI/CD**:
   - ビルド・テスト自動化（将来実装）
   - 自動デプロイ（将来実装）

## 技術的制約

### パフォーマンス制約

- **初期ロード時間**: 3秒以内
- **Time to Interactive**: 5秒以内
- **バンドルサイズ**: 初期バンドルは500KB以下

### ブラウザサポート

- Chrome (最新の2バージョン)
- Firefox (最新の2バージョン)
- Safari (最新の2バージョン)
- Edge (最新の2バージョン)

### モバイル対応

- iOS 14以上
- Android 10以上

### アクセシビリティ

- WCAG 2.1 AA準拠

## 依存関係

### コア依存関係

```json
{
  "dependencies": {
    "@angular/animations": "^19.2.6",
    "@angular/common": "^19.2.6",
    "@angular/compiler": "^19.2.6",
    "@angular/core": "^19.2.6",
    "@angular/forms": "^19.2.6",
    "@angular/platform-browser": "^19.2.6",
    "@angular/platform-browser-dynamic": "^19.2.6",
    "@angular/router": "^19.2.6",
    "@tailwindcss/postcss": "^4.1.7",
    "postcss": "^8.5.3",
    "rxjs": "~7.8.0",
    "tailwindcss": "^4.1.7",
    "tslib": "^2.3.0",
    "zone.js": "~0.15.0"
  }
}
```

### 開発依存関係

```json
{
  "devDependencies": {
    "@angular-devkit/build-angular": "^19.2.7",
    "@angular/cli": "^19.2.7",
    "@angular/compiler-cli": "^19.2.6",
    "@eslint/js": "^9.26.0",
    "@types/jasmine": "~5.1.0",
    "angular-cli-ghpages": "2.0.3",
    "eslint": "^9.26.0",
    "eslint-config-prettier": "^10.1.3",
    "eslint-plugin-html": "^8.1.2",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-prettier": "^5.4.0",
    "jasmine-core": "~5.2.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "prettier": "^3.5.3",
    "typescript": "~5.5.2",
    "typescript-eslint": "^8.32.0"
  }
}
```

## ツール使用パターン

### yarn

```bash
# パッケージのインストール
yarn add package-name           # 通常の依存関係
yarn add -D package-name        # 開発依存関係

# スクリプトの実行
yarn start                      # 開発サーバーの起動 (ポート4201)
yarn build                      # プロダクションビルドの作成
yarn test                       # テストの実行
yarn lint                       # リントチェックの実行 (ESLintとPrettierを実行)
```

### Angular CLI

```bash
# コンポーネントの生成
ng generate component components/ui/button

# サービスの生成
ng generate service services/traffic-data

# インターフェースの生成
ng generate interface models/traffic-data
```

### ESLint & Prettier

```bash
# コードのリントとフォーマット
yarn lint
```

## データフロー

### 開発段階

1. **静的データ**: 開発初期段階では、`assets/data/` ディレクトリ内のJSONファイルからデータを読み込む
2. **データサービス**: Angular HTTPクライアントを使用してJSONファイルを取得
3. **状態管理**: Angular Signalを使用してデータをコンポーネントに提供

### 将来的な実装

1. **APIコネクション**: バックエンドAPIからリアルタイムデータを取得
2. **キャッシュ戦略**: HTTPインターセプターとローカルストレージによるキャッシュ
3. **リアルタイム更新**: WebSocketを使用したリアルタイムデータ更新（オプション）

## モジュール依存関係

初期フェーズではモジュールの依存関係は最小限に保ち、スタンドアロンコンポーネントアプローチを採用します。これにより、アプリケーションの構造はシンプルに保たれ、将来的な拡張が容易になります。

### 主要依存関係グラフ

```text
AppComponent
├── CoreServices (TrafficDataService, etc.)
├── SharedComponents (UI components)
└── FeatureComponents (Map, TimeSelector, etc.)
```

## デバッグとトラブルシューティング

- Angular DevTools Chromeプラグインを使用したコンポーネントとRouterの検査
- ブラウザの開発者ツールを使用したネットワークリクエストのモニタリング
- ngコマンドラインツールを使用したアプリケーションの分析

```bash
# バンドルサイズの分析
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```
