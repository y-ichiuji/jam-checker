---
applyTo: "**"
---

# Jam Checker - システムパターンとアーキテクチャガイドライン

このドキュメントは、Jam Checkerアプリケーションのアーキテクチャ設計原則、コンポーネント構造、責任分担、およびコーディングガイドラインをまとめたものです。

## システムアーキテクチャ

Jam Checkerは、モダンなAngularアーキテクチャに基づいて設計されています。

```text
クライアント層
    │
    ├── UI層（コンポーネント）
    │   ├── Presentational Components（表示のみ）
    │   └── Container Components（ロジックと状態管理）
    │
    ├── サービス層（ステートレス）
    │   ├── データサービス（データ取得のみ）
    │   └── ユーティリティサービス
    │
    ├── 状態管理（Angular Signal）
    │   └── ストア（共有状態）
    │
    └── モデル層（データモデル/インターフェース）
```

### フロントエンドアーキテクチャ

Jam Checkerはフロントエンド中心のアプリケーションで、初期フェーズでは静的データを使用し、将来的にはバックエンドAPIと連携します。

## レイヤー間の責任分担

各レイヤーの責任分担については、以下のリンクを参照してください：

- [サービス層（Service Layer）](../service.instructions.md)
- [コンテナコンポーネント（Container Components）](../container.instructions.md)
- [プレゼンテーションコンポーネント（Presentation Components）](../presentation.instructions.md)
- [共有ストア（Shared Stores）](../store.instructions.md)

## 通信パターンとデータフロー

### コンポーネント間の通信

1. **親 → 子**: input()シグナルを使用。
2. **子 → 親**: output()シグナルを使用。
3. **非親子間**: 共有Storeを使用。

### レイヤー間の情報の流れ

1. **サービス → コンテナ → プレゼンテーション**:
   - サービスがデータソースからデータを取得し、コンテナがシグナルとして状態を管理し、プレゼンテーションコンポーネントが表示。

2. **Store → コンテナ → プレゼンテーション**:
   - 共有ストアがアプリケーション全体の状態を管理し、コンテナがストアを購読し、プレゼンテーションコンポーネントが表示。

### データフローの完全なサイクル

```text
ユーザー操作 → Presentationalコンポーネント → outputシグナル → Containerコンポーネント → サービス/ストア → データ更新 → Containerの状態更新 → Presentationalコンポーネント更新
```

## 主要な設計原則

Jam Checkerでは、コードの保守性と拡張性を高めるために、以下の設計原則を採用しています。

1. **サービスは状態を持たない（ステートレス）**:
   - サービスは純粋にデータの取得と処理のみを担当し、内部で状態を保持しない。

2. **状態管理はコンテナとストアの役割**:
   - コンポーネント固有の状態はコンテナコンポーネントで、共有状態はストアで管理する。

3. **Presentational/Containerパターンの徹底**:
   - Presentationalコンポーネントは表示とユーザーイベントの転送のみ、Containerコンポーネントはロジックと状態管理を担当する。

## 主要な技術選定

### Angular 19.2の採用

- 最新のAngularフレームワーク、スタンドアロンコンポーネント、シグナルAPI、TypeScriptの型安全性を活用。

### Presentational/Containerパターン

- 関心の分離を実現し、コンポーネントの再利用性と保守性を高めるパターンを採用。

### Angular Signalによる状態管理

- リアクティブな状態管理と効率的な変更検出のため、専用ストアクラスとシグナルパターンを使用。

### データフローパターン

- 単方向データフロー（Container→Presentational）とoutputシグナルによるイベント処理（Presentational→Container）を採用。

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

## 実装パターン

### マップ表示機能

1. **Map Display Component (Presentational)**
   - マップの視覚的表示、混雑状況レンダリング、ユーザー操作のイベント発信を担当。

2. **Map Container Component**
   - TrafficDataServiceからデータ取得、マップ状態管理、子コンポーネントへのデータ提供を担当。

3. **Map Service**
   - 純粋なデータ取得のみを担当し、HTTPクライアントでGeoJSONデータを取得。

### 時間選択機能

1. **Time Selector Display Component (Presentational)**
   - 時間選択UIを表示し、選択イベントを親コンポーネントに通知。

2. **Time Selector Container Component**
   - 時間帯リスト管理、選択状態管理、関連サービスへの通知を担当。

### テスト実装パターン

1. **Presentationalコンポーネントのテスト**
   - 入力シグナルの表示確認、出力シグナルの発火確認、ユーティリティメソッドの動作確認。

2. **Containerコンポーネントのテスト**
   - 依存サービスのモック作成、fakeAsyncを使用した非同期処理のテスト、子コンポーネントへのデータ伝達確認。

3. **サービステスト**
   - HttpTestingControllerを使用したHTTPリクエストのテスト、エラーハンドリングのテスト、非同期処理のテスト。

4. **Storeテスト**
   - シグナル更新の確認、非同期アクションのテスト、状態管理のテスト。

## コーディングガイドライン

### マジックナンバーの定数化

**原則**: コード内に直接数値を埋め込まず、常に意味のある名前の定数を使用します。

1. **定数の命名規則**
   - 大文字のスネークケース（UPPER_SNAKE_CASE）を使用する。
   - 明確な意味を持つ名前をつける（例: `DEFAULT_CANVAS_WIDTH`）。
   - 単位がある場合は含める（例: `TIMEOUT_MS`, `MAX_WIDTH_PX`）。

2. **定数の配置場所**
   - コンポーネント固有の定数: コンポーネント内で定義する。
   - モデル/機能固有の定数: モデルファイルで定義する。
   - 共有定数: 専用の定数ファイル（constants.ts）で定義する。

## エラーハンドリングパターン

1. **サービス層でのエラーキャッチ**
   - すべてのサービスメソッドでtry-catchを使用し、適切なエラー処理を行う。

2. **UI層でのエラー表示**
   - エラー状態をシグナルで管理し、ユーザーフレンドリーなメッセージとリトライオプションを提供。

## パフォーマンス最適化パターン

1. **遅延ロード**: Routingモジュールによる機能分割で初期ロードを高速化。

2. **メモ化テクニック**: computed()シグナルで不要な再計算を防止。

3. **変更検出の最適化**: OnPush戦略で不要なテンプレート更新を削減。

## 拡張ポイント

現在の実装は、以下の拡張に対応できるよう設計されています:

1. **交通混雑データの統合**: MapDataモデル拡張と混雑レベル表示ロジックを追加。

2. **時間選択機能との統合**: 時間選択イベントによる地図データフィルタリングを実装。

3. **詳細情報表示**: エリアクリック時の詳細情報パネル表示機能を追加。
