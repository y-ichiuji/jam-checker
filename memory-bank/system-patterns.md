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
    ├── サービス層（ステートレス）
    │   ├── データサービス（データ取得のみ）
    │   └── ユーティリティサービス
    │
    ├── 状態管理（Angular Signal）
    │   └── ストア（共有状態）
    │
    └── モデル層（データモデル/インターフェース）
```

### 責任分担の原則

Jam Checkerでは以下の責任分担の原則に従って設計を行っています：

1. **サービス（Service）**:
   - 内部に状態を保持しない（ステートレス）
   - データの取得や処理のみを担当
   - 副作用（HTTP呼び出しなど）を封じ込める

2. **Container（コンテナ）コンポーネント**:
   - サービスやストアからデータを取得
   - コンポーネント固有の状態管理を担当
   - 子コンポーネントへのデータ提供

3. **Store（ストア）**:
   - 複数のコンポーネント間で共有される状態の管理
   - シグナルベースでの状態管理
   - 複雑な状態変更ロジックのカプセル化

### フロントエンドアーキテクチャ

Jam Checkerはフロントエンド中心のアプリケーションで、初期フェーズでは静的データを使用し、将来的にはバックエンドAPIと連携するように設計されています。

### レイヤー間の情報の流れ

1. **サービス → コンテナ → プレゼンテーション**:
   - サービスがデータソースからデータを取得（状態は保持しない）
   - コンテナコンポーネントがデータを受け取り、シグナルとして状態を管理
   - プレゼンテーションコンポーネントが状態を表示

2. **Store → コンテナ → プレゼンテーション**:
   - 共有ストアがアプリケーション全体で共有される状態を管理
   - コンテナコンポーネントがストアの状態を購読
   - プレゼンテーションコンポーネントが状態を表示

## 主要な設計原則

Jam Checkerでは、コードの保守性と拡張性を高めるために、以下の設計原則を採用しています。各レイヤーの詳細な実装ガイドラインやベストプラクティスについては [architecture-guidelines.md](./architecture-guidelines.md) を参照してください。

1. **サービスは状態を持たない（ステートレス）**:
   - サービスは純粋にデータの取得と処理のみに責任を持ち、内部で状態を保持しない
   - 例: MapServiceはGeoJSONデータを取得するだけで、データの状態は保持しない

2. **状態管理はコンテナとストアの役割**:
   - コンテナコンポーネントはコンポーネント固有の状態を管理
   - 共有ストアはアプリケーション全体や複数コンポーネント間の共有状態を管理

3. **Presentational/Containerパターンの徹底**:
   - Presentationalコンポーネントは表示とユーザーイベントの転送のみを担当
   - Containerコンポーネントはロジックと状態管理を担当

## 主要な技術選定

### Angular 19.2の採用

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

**実装パターン:**

1. **プライベートなシグナル変数で内部状態を管理:**

   ```typescript
   private readonly mapDataSignal = signal<FeatureCollection | null>(null);
   ```

1. **読み取り専用の公開シグナルでカプセル化:**

   ```typescript
   protected readonly mapData = this.mapDataSignal.asReadonly();
   ```

1. **computedシグナルで派生状態を計算:**

   ```typescript
   protected readonly hasTransformChanged = computed(() => {
   const transform = this.mapTransformSignal();
   const initialTransform = createInitialTransform();
   return (
      transform.scale !== initialTransform.scale ||
      transform.offsetX !== initialTransform.offsetX ||
      transform.offsetY !== initialTransform.offsetY
   );
   });
   ```

1. **updateメソッドで不変的に状態を更新:**

   ```typescript
   this.mapTransformSignal.update(transform => ({
   ...transform,
   offsetX: transform.offsetX + event.deltaX,
   offsetY: transform.offsetY + event.deltaY,
   }));
   ```

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

   **実装詳細:**

   ```typescript
   // 入力シグナル
   readonly mapData = input<FeatureCollection | null>(null);
   readonly loading = input<boolean>(false);
   readonly error = input<string | null>(null);
   readonly transform = input<MapTransform>(createInitialTransform());

   // 出力シグナル
   readonly mapClick = output<{ x: number; y: number }>();
   readonly retryLoad = output<void>();
   readonly panEvent = output<PanEvent>();
   readonly zoomEvent = output<ZoomEvent>();
   readonly boundsChange = output<MapBounds>();
   ```

   **特筆すべき技術:**
   - ResizeObserverを使用した効率的なキャンバスサイズ変更処理
   - 効果的なイベントリスナー管理（追加/削除）
   - effectを使用したリアクティブなUI更新

2. Map Container Component
   - TrafficDataServiceからデータを取得
   - マップの状態を管理（中心座標、ズームレベルなど）
   - 取得したデータをMap Display Componentに渡す
   - すべての状態をコンポーネント内のシグナルで管理

   **実装詳細:**

   ```typescript
   // プライベートシグナル（状態管理）
   private readonly mapDataSignal = signal<FeatureCollection | null>(null);
   private readonly loadingSignal = signal<boolean>(false);
   private readonly errorSignal = signal<string | null>(null);
   private readonly mapTransformSignal = signal<MapTransform>(createInitialTransform());
   private readonly mapBoundsSignal = signal<MapBounds | null>(null);

   // 公開シグナル（読み取り専用）
   protected readonly mapData = this.mapDataSignal.asReadonly();
   protected readonly loading = this.loadingSignal.asReadonly();
   protected readonly error = this.errorSignal.asReadonly();
   protected readonly mapTransform = this.mapTransformSignal.asReadonly();
   protected readonly mapBounds = this.mapBoundsSignal.asReadonly();

   // 計算されたシグナル
   protected readonly hasTransformChanged = computed(() => {
     const transform = this.mapTransformSignal();
     const initialTransform = createInitialTransform();
     return (
       transform.scale !== initialTransform.scale ||
       transform.offsetX !== initialTransform.offsetX ||
       transform.offsetY !== initialTransform.offsetY
     );
   });

   // サービスからデータを取得しシグナルで状態管理
   protected async loadMapData(): Promise<void> {
     try {
       this.loadingSignal.set(true);
       this.errorSignal.set(null);

       // サービスからデータを取得（サービス自体は状態を持たない）
       const data = await this.mapService.fetchWorldMapData();
       this.mapDataSignal.set(data);
     } catch (error) {
       console.error('地図データの取得に失敗しました', error);
       this.errorSignal.set('地図データの取得に失敗しました');
     } finally {
       this.loadingSignal.set(false);
     }
   }
   ```

   **特筆すべき機能:**
   - 非同期データ取得と適切なエラーハンドリング
   - 効率的なズーム処理（ズーム中心点の固定）
   - 適切な状態カプセル化（プライベート変更、公開読み取り専用）

3. Map Service
   - 純粋なデータ取得のみを担当（ステートレス）
   - HTTPクライアントを使用したGeoJSONデータ取得
   - 状態管理は一切行わない

   **実装例:**

   ```typescript
   // ステートレスなサービスの例
   export class MapService {
     private http = inject(HttpClient);

     async fetchWorldMapData(): Promise<FeatureCollection> {
       try {
         // データの取得のみを行い、内部で状態は保持しない
         return await firstValueFrom(this.http.get<FeatureCollection>('geojson/world-map.geojson'));
       } catch (error) {
         console.error('地図データの取得に失敗しました', error);
         throw new Error('地図データの取得に失敗しました');
       }
     }
   }
   ```

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

具体的なデータフローの例:

1. **データ取得の流れ:**

   ```planetext
   MapContainerComponent → MapService → HTTP API → GeoJSONデータ →
   MapContainerComponent (mapDataSignal更新) → MapViewComponent (描画)
   ```

1. **ユーザー操作の流れ:**

   ```planetext
   ユーザー操作 → MapViewComponent → output signals (panEvent, zoomEvent) →
   MapContainerComponent (mapTransformSignal更新) → MapViewComponent (再描画)
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

## 拡張ポイント

現在の実装は、以下の拡張に対応できるよう設計されています:

1. **交通混雑データの統合:**
   - MapDataモデルの拡張
   - 混雑レベルに基づく描画ロジックの追加
   - 凡例表示コンポーネントの追加

2. **時間選択機能との統合:**
   - 時間選択コンポーネントからのイベントに基づく地図データフィルタリング
   - 特定時間の交通状況表示

3. **詳細情報表示:**
   - エリアクリック時の詳細情報パネル表示
   - 混雑状況の詳細データ表示
