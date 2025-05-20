# Jam Checker - システムパターン

## システムアーキテクチャ

Jam Checkerは、モダンなAngularアーキテクチャに基づいて設計されています。以下にシステム全体の構造を示します。

```text
クライアント層
    │
    ├── UI層（コンポーネント）
    │   ├── Presentational Components（表示のみ）
    │   └── Container Components（ロジックと状態管理）
    │
    ├── サービス層
    │   ├── データサービス
    │   └── ユーティリティサービス
    │
    ├── 状態管理（Angular Signal）
    │   └── ストア
    │
    └── モデル層（データモデル/インターフェース）
```

### フロントエンドアーキテクチャ

Jam Checkerはフロントエンド中心のアプリケーションで、初期フェーズでは静的データを使用し、将来的にはバックエンドAPIと連携するように設計されています。

## 主要な技術的決定

### 1. Angular 19.2の採用

- **理由**: 最新のAngularフレームワークを採用し、パフォーマンスと開発効率を向上させるため
- **メリット**:
  - スタンドアロンコンポーネントのサポート
  - Angularシグナルによる効率的な状態管理（input/outputシグナル関数）
  - TypeScriptによる型安全性
  - コンポーネントベースのアーキテクチャ

### 2. Presentational/Containerパターン

- **理由**: 関心の分離を実現し、コンポーネントの再利用性と保守性を高めるため
- **実装方法**:
  - Presentationalコンポーネント: 表示のみを担当し、データはInputとして受け取る
  - Containerコンポーネント: データの取得とロジックを処理し、Presentationalコンポーネントに渡す

### 3. Angular Signalによる状態管理

- **理由**: リアクティブな状態管理と効率的な変更検出を実現するため
- **実装方法**:
  - 各機能ごとに専用のストアクラスを作成
  - シグナルとコンピューテッドシグナルで状態を管理
  - ストアクラス内でアクションメソッドを定義

### 4. データフローパターン

- **単方向データフロー**: Containerコンポーネントからのデータの変更が、Presentationalコンポーネントに伝播される
- **イベント処理**: Presentationalコンポーネントからのイベントは、outputシグナル関数を使用してContainerコンポーネントに伝えられる

具体的な実装例については、`.github/.copilot-codeGeneration-instructions.md`を参照してください。

## コンポーネント関係図

```text
App Component
    │
    ├── Header Component
    │
    ├── Map Container Component
    │   └── Map Display Component (Presentational)
    │
    ├── Time Selector Container Component
    │   └── Time Selector Display Component (Presentational)
    │
    ├── Traffic Info Container Component
    │   └── Traffic Info Display Component (Presentational)
    │
    └── Footer Component
```

## 重要な実装パス

### マップ表示機能

1. Map Display Component (Presentational)
   - マップの視覚的表示のみを担当
   - 混雑状況のレンダリングを行う
   - ユーザー操作（ズーム、パン）をoutputシグナルを通じて親コンポーネントに通知

2. Map Container Component
   - TrafficDataServiceからデータを取得
   - マップの状態を管理（中心座標、ズームレベルなど）
   - 取得したデータをMap Display Componentに渡す

### 時間選択機能

1. Time Selector Display Component (Presentational)
   - 時間選択UI（スライダー、セレクトボックスなど）を表示
   - 選択された時間をoutputシグナルを通じて親コンポーネントに通知

2. Time Selector Container Component
   - 利用可能な時間帯リストの管理
   - 選択された時間の状態管理
   - 時間選択イベントの処理と関連サービスへの通知

### テスト実装パターン

1. Presentationalコンポーネントのテスト
   - 入力シグナルの表示確認
   - 出力シグナルの発火確認
   - ユーティリティメソッドの動作確認

2. Containerコンポーネントのテスト
   - 依存サービスのモック作成
   - fakeAsyncを使用した非同期処理のテスト
   - 子コンポーネントへのデータ伝達確認

3. サービステスト
   - HttpTestingControllerを使用したHTTPリクエストのテスト
   - エラーハンドリングのテスト
   - 非同期処理のテスト（fakeAsync/tick）

4. Storeテスト
   - シグナル更新の確認
   - 非同期アクションのテスト
   - 選択された時間の状態管理
   - 時間選択イベントをアプリケーション全体に通知

### データフロー

```text
User Action → Presentationalコンポーネント → outputシグナル →
Containerコンポーネント → サービス呼び出し →
データ更新 → シグナル更新 →
Containerコンポーネント再レンダリング → Presentationalコンポーネント更新
```

## エラーハンドリングパターン

1. **サービス層でのエラーキャッチ**:
   - すべてのサービスメソッドでtry-catchを使用
   - エラーログの記録と適切なエラーの返却

2. **UI層でのエラー表示**:
   - エラー状態をシグナルで管理
   - ユーザーフレンドリーなエラーメッセージの表示
   - 必要に応じてリトライオプションの提供

## パフォーマンス最適化パターン

1. **遅延ロード**:
   - アプリケーションの初期ロードを高速化するため、主要機能以外は遅延ロード
   - Routingモジュールを使用して機能ごとに分割

2. **メモ化テクニック**:
   - 計算コストの高いロジックは`computed`シグナルを使用してメモ化
   - 不要な再計算を防止

3. **変更検出の最適化**:
   - OnPushの変更検出戦略を採用
   - 不要なテンプレート更新を削減

## テストパターン

1. **コンポーネントテスト**:
   - Presentationalコンポーネントは入力と出力のみをテスト
   - Containerコンポーネントはサービスとの連携をテスト

2. **サービステスト**:
   - 外部依存をモック化してサービスの機能をテスト
   - エラーケースのテストを重視

3. **E2Eテスト**:
   - 主要なユーザーフローを自動化テストでカバー
