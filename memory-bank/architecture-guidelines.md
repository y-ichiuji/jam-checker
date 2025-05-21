# Jam Checker - アーキテクチャガイドライン

## レイヤー間の責任分担

Jam Checkerプロジェクトでは、各レイヤーの責任を明確に分離し、関心事の分離を実現しています。以下に各レイヤーの責任と実装ガイドラインを示します。

### サービス層（Service Layer）

**原則**: サービスは状態を保持せず、データの取得と処理のみを担当します

1. **ステートレス設計**
   - サービス内でSignalやその他の状態管理変数を持たない
   - 受け取ったパラメータに基づいて処理し、結果を返すのみ
   - コンポーネント間で共有される状態はStoreクラスで管理

2. **責任**
   - 外部リソース（API、ローカルストレージなど）へのアクセス
   - 複雑なビジネスロジックの実行
   - データ変換や加工

3. **実装例**

```typescript
@Injectable({
  providedIn: 'root',
})
export class MapService {
  private http = inject(HttpClient);

  // ✅ 良い例: 単なるデータ取得のみを実装
  async fetchWorldMapData(): Promise<FeatureCollection> {
    try {
      return await firstValueFrom(
        this.http.get<FeatureCollection>('geojson/world-map.geojson')
      );
    } catch (error) {
      console.error('地図データの取得に失敗しました', error);
      throw new Error('地図データの取得に失敗しました');
    }
  }

  // ❌ 悪い例: サービス内で状態を保持している
  // private readonly dataSignal = signal<FeatureCollection | null>(null);
  // readonly data = this.dataSignal.asReadonly();
  //
  // async loadWorldMapData(): Promise<void> {
  //   const data = await this.fetchWorldMapData();
  //   this.dataSignal.set(data);
  // }
}
```

### コンテナコンポーネント（Container Components）

**原則**: データの取得、状態管理、およびプレゼンテーションコンポーネントへのデータ提供を担当します

1. **状態管理**
   - コンポーネント固有の状態をSignalで管理
   - プライベートな変更可能シグナルと公開読み取り専用シグナルの分離
   - 計算された派生状態にはcomputed()を使用

2. **データソース**
   - サービスからのデータ取得
   - 共有Storeからの状態購読
   - ローカルUIの状態管理

3. **実装例**

```typescript
@Component({...})
export class MapContainerComponent implements OnInit {
  private mapService = inject(MapService);

  // ✅ 良い例: コンテナでの状態管理
  // プライベートなシグナル変数（内部での変更用）
  private readonly mapDataSignal = signal<FeatureCollection | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // 公開用の読み取り専用シグナル（子コンポーネントへの提供用）
  protected readonly mapData = this.mapDataSignal.asReadonly();
  protected readonly loading = this.loadingSignal.asReadonly();
  protected readonly error = this.errorSignal.asReadonly();

  // 派生状態の計算
  protected readonly hasData = computed(() => !!this.mapDataSignal());

  ngOnInit(): void {
    this.loadMapData();
  }

  protected async loadMapData(): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // サービスからデータを取得（サービスは状態を持たない）
      const data = await this.mapService.fetchWorldMapData();
      this.mapDataSignal.set(data);
    } catch (error) {
      console.error('地図データの取得に失敗しました', error);
      this.errorSignal.set('地図データの取得に失敗しました');
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
```

### 共有ストア（Shared Stores）

**原則**: 複数のコンポーネント間で共有される状態を一元管理します

1. **状態管理**
   - 機能ごとに専用のStoreクラスを作成
   - プライベートな状態と公開用の読み取り専用APIの分離
   - アクションメソッドによる状態変更の一元化

2. **責任**
   - グローバルまたは機能間で共有される状態の管理
   - コンポーネント間の状態同期
   - 永続化が必要な状態の管理

3. **実装例**

```typescript
@Injectable({
  providedIn: 'root',
})
export class TrafficDataStore {
  // プライベート状態
  private readonly trafficDataSignal = signal<TrafficData[]>([]);
  private readonly selectedTimeSignal = signal<Date | null>(null);
  private readonly loadingSignal = signal<boolean>(false);

  // 公開用読み取り専用API
  readonly trafficData = this.trafficDataSignal.asReadonly();
  readonly selectedTime = this.selectedTimeSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  // 計算された派生状態
  readonly filteredData = computed(() => {
    const time = this.selectedTimeSignal();
    if (!time) return this.trafficDataSignal();

    return this.trafficDataSignal().filter(data =>
      isSameTimeFrame(data.timestamp, time)
    );
  });

  // 状態変更のためのアクションメソッド
  async loadTrafficData(service: TrafficDataService): Promise<void> {
    this.loadingSignal.set(true);
    try {
      const data = await service.fetchTrafficData();
      this.trafficDataSignal.set(data);
    } finally {
      this.loadingSignal.set(false);
    }
  }

  setSelectedTime(time: Date | null): void {
    this.selectedTimeSignal.set(time);
  }
}
```

## プレゼンテーションコンポーネント（Presentation Components）

**原則**: データの表示とユーザーインタラクションの処理のみを担当します

1. **状態**
   - 内部状態は最小限に留める（主にUIの一時的な状態のみ）
   - 親コンポーネントからの入力をinput()シグナルで受け取る
   - ユーザーアクションをoutput()シグナルで親に通知

2. **責任**
   - UIの描画
   - ユーザー入力の処理
   - アニメーションや視覚効果

3. **実装例**

```typescript
@Component({...})
export class MapViewComponent {
  // 入力シグナル - 親コンポーネントからデータを受け取る
  readonly mapData = input<FeatureCollection | null>(null);
  readonly loading = input<boolean>(false);
  readonly error = input<string | null>(null);

  // 出力シグナル - ユーザーアクションを親コンポーネントに通知
  readonly mapClick = output<{ x: number; y: number }>();
  readonly retryLoad = output<void>();

  // 純粋にUI関連の内部状態のみ
  private isHovering = signal<boolean>(false);

  handleMapClick(event: MouseEvent): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 親コンポーネントに通知
    this.mapClick.emit({ x, y });
  }
}
```

## 通信パターン

### コンポーネント間の通信

1. **親 → 子**: input()シグナル
2. **子 → 親**: output()シグナル
3. **非親子間**: 共有Store

### データフローの例

```planetext
User Action → Presentational Component → output()シグナル →
Container Component → Store/Service →
状態更新 → Container Component → input()シグナル →
Presentational Component → 画面更新
```

## まとめ: 責任分担の原則

- **サービス**: 状態を持たず、データ取得と処理のみを行う
- **コンテナ**: コンポーネント固有の状態を管理し、子コンポーネントにデータを提供
- **ストア**: 複数のコンポーネント間で共有される状態を管理
- **プレゼンテーション**: データの表示とユーザーアクションの通知のみを行う

## コーディングガイドライン

### マジックナンバーの定数化

**原則**: コード内に直接数値を埋め込まず、常に意味のある名前の定数を使用します。

1. **定数の命名規則**
   - 大文字のスネークケース（UPPER_SNAKE_CASE）を使用
   - 明確な意味を持つ名前をつける（例: `DEFAULT_CANVAS_WIDTH`）
   - 単位がある場合は含める（例: `TIMEOUT_MS`, `MAX_WIDTH_PX`）

2. **定数の配置場所**
   - コンポーネント固有の定数: コンポーネント内で定義
   - モデル/機能固有の定数: モデルファイルで定義
   - 共有定数: 専用の定数ファイル（constants.ts）で定義

3. **適切にグループ化**
   - 関連する定数は`const CONSTANTS = { ... }`オブジェクト内にグループ化
   - オブジェクト名は機能や目的を反映（例: `MAP_VIEW_CONSTANTS`, `MAP_TRANSFORM_CONSTANTS`）
   - コメントで各定数の意味と単位を説明

4. **実装例**

    ```typescript
    /**
     * MapContainer内で使用する定数
    */
    const MAP_CONTAINER_CONSTANTS = {
      /** デフォルトのキャンバス幅 */
      DEFAULT_CANVAS_WIDTH: 1000,
      /** デフォルトのキャンバス高さ */
      DEFAULT_CANVAS_HEIGHT: 800,
      /** 大きな移動の閾値（ピクセル） */
      LARGE_PAN_THRESHOLD: 50,
      /** 最小スケール */
      MIN_SCALE: 1.0,
      /** マックス移動制限の基本値 */
      BASE_OFFSET_LIMIT: 500,
      /** キャンバス幅に対するオフセット制限の比率 */
      CANVAS_WIDTH_OFFSET_RATIO: 0.6,
    };

    /**
     * MapView内で使用する定数
    */
    const MAP_VIEW_CONSTANTS = {
      /** ズーム処理のスムージング係数（0.1 = 10%ずつ） */
      ZOOM_FACTOR: 0.1,
      /** マップの横方向の余白率（0.95 = 95%表示） */
      MAP_WIDTH_SCALE_FACTOR: 0.95,
      /** マップの縦方向の余白率（0.85 = 85%表示） */
      MAP_HEIGHT_SCALE_FACTOR: 0.85,
    };
    ```

5. **マジックナンバーになりやすい値**

   - タイムアウト値（ミリ秒）
   - サイズや位置の調整値（ピクセル、パーセンテージなど）
   - 閾値や制限値
   - スケーリング係数
   - インデックス値
   - 色やスタイル値
   - APIのステータスコード

6. **メリット**

   - コードの可読性と保守性の向上
   - 値の意味の明確化
   - 変更が必要な場合の一元管理
   - 同じ値を複数箇所で使用する際の一貫性確保
   - 自己文書化コードの促進
