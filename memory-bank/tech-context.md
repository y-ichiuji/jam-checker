# Jam Checker - 技術コンテキスト

## 使用技術

Jam Checkerの開発には、以下の技術スタックを使用しています：

### コアフレームワークとライブラリ

- **Angular 19**: メインフレームワーク
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

- **Tailwind CSS**: ユーティリティファーストのCSSフレームワーク
  - レスポンシブデザイン
  - カスタマイズ可能なコンポーネント
  - パフォーマンス最適化

- **HTML5**: マークアップ言語
  - セマンティックなHTMLの使用
  - アクセシビリティ対応

### 開発ツール

- **Node.js**: JavaScriptランタイム
- **yarn**: パッケージ管理ツール
- **Angular CLI**: Angularプロジェクト管理ツール
- **ESLint**: コード品質チェックツール
- **Prettier**: コードフォーマッター

### テスト

- **Jasmine**: テストフレームワーク
- **Karma**: テストランナー
- **Angular Testing Utilities**: コンポーネントテスト用ユーティリティ

### ビルドとデプロイ

- **webpack**: モジュールバンドラー（Angular内部で使用）
- **GitHub Actions**: CI/CDパイプライン（将来実装予定）

## 開発環境セットアップ

### 必要条件

- Node.js 20.x以上
- yarn 2.x以上
- Git

### 環境構築手順

```bash
# リポジトリをクローン
git clone https://github.com/username/jam-checker.git
cd jam-checker

# 依存関係のインストール
yarn install

# 開発サーバーの起動
yarn start
```

### 開発サーバー

開発サーバーは `http://localhost:4200` で起動します。
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
    "@angular/animations": "^19.0.0",
    "@angular/common": "^19.0.0",
    "@angular/compiler": "^19.0.0",
    "@angular/core": "^19.0.0",
    "@angular/forms": "^19.0.0",
    "@angular/platform-browser": "^19.0.0",
    "@angular/platform-browser-dynamic": "^19.0.0",
    "@angular/router": "^19.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.0"
  }
}
```

### 開発依存関係

```json
{
  "devDependencies": {
    "@angular-devkit/build-angular": "^19.0.0",
    "@angular/cli": "^19.0.0",
    "@angular/compiler-cli": "^19.0.0",
    "@types/jasmine": "~5.1.0",
    "autoprefixer": "^10.4.14",
    "jasmine-core": "~5.1.0",
    "karma": "~6.4.0",
    "karma-chrome-launcher": "~3.2.0",
    "karma-coverage": "~2.2.0",
    "karma-jasmine": "~5.1.0",
    "karma-jasmine-html-reporter": "~2.1.0",
    "postcss": "^8.4.23",
    "tailwindcss": "^3.3.2",
    "typescript": "~5.2.2"
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
yarn start                      # 開発サーバーの起動
yarn build                      # プロダクションビルドの作成
yarn test                       # テストの実行
yarn lint                       # リントチェックの実行
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
# コードのリント
yarn lint

# コードのフォーマット
yarn format
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
