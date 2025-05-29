# Jam Checker - ストアパターン実装ガイドライン

## ストアの役割と責任

ストアは、アプリケーション内で共有される状態を管理し、その状態の変更やアクセスを一元化する役割を持ちます。

### 主要な責任

1. **状態の保持と公開**:
   - アプリケーションの状態データを保持
   - 読み取り専用のAPIを通じて状態を公開
   - 派生状態（計算された値）の提供

2. **状態変更の一元管理**:
   - アクションメソッドを通じた状態の変更
   - 状態変更の一貫性確保
   - 副作用の管理（非同期処理など）

3. **他のサービスとの連携**:
   - ステートレスなサービスからデータを取得
   - 複雑なビジネスロジックの実行を委譲
   - データ変換と状態の更新

## 実装パターン

### TrafficDataStoreの実装例

```typescript
@Injectable({
  providedIn: 'root',
})
export class TrafficDataStore {
  private trafficDataService = inject(TrafficDataService);

  // 内部状態管理用のシグナル
  private readonly trafficDataSignal = signal<DailyTrafficData | null>(null);
  private readonly selectedHourSignal = signal<HourOfDay>(new Date().getHours() as HourOfDay);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly selectedRoadIdSignal = signal<string | null>(null);

  // 読み取り専用の公開シグナル
  public readonly trafficData = this.trafficDataSignal.asReadonly();
  public readonly selectedHour = this.selectedHourSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();
  public readonly selectedRoadId = this.selectedRoadIdSignal.asReadonly();

  // 計算されたシグナル
  public readonly hasTrafficData = computed(() => !!this.trafficDataSignal());

  // アクションメソッド
  public async loadTrafficData(roadData: FeatureCollection | null): Promise<void> {
    // 実装...
  }

  public selectHour(hour: HourOfDay): void {
    // 実装...
  }

  public selectRoad(roadId: string | null): void {
    // 実装...
  }
}
```

## ストアの基本設計原則

### 1. プライベート/パブリック分離パターン

- **内部状態**: `private readonly xxxSignal = signal<Type>(initialValue);`
- **公開API**: `public readonly xxx = this.xxxSignal.asReadonly();`

このパターンにより、コンポーネントが直接シグナルを変更することを防ぎ、アクションメソッドを通じてのみ変更を行うようにします。

### 2. 計算されたシグナル（Computed Signals）

```typescript
public readonly selectedRoadTrafficData = computed(() => {
  const roadId = this.selectedRoadIdSignal();
  const trafficData = this.trafficDataSignal();
  // 計算ロジック...
  return result;
});
```

派生データはcomputedシグナルとして実装し、依存するシグナルが変更されたときのみ再計算されるようにします。

### 3. アクションメソッド

```typescript
public selectHour(hour: HourOfDay): void {
  if (hour >= 0 && hour <= 23) {
    this.selectedHourSignal.set(hour);
  }
}
```

- 状態変更は必ずアクションメソッドを通じて行う
- 入力値のバリデーションを行う
- 必要に応じて複数のシグナルを一貫性を持って更新する
- 非同期処理はasync/awaitで実装し、loadingとerror状態を適切に管理する

### 4. サービスとの連携

```typescript
public async loadTrafficData(roadData: FeatureCollection | null): Promise<void> {
  try {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const data = await this.trafficDataService.fetchTrafficData(roadData);
    this.trafficDataSignal.set(data);
  } catch (error) {
    console.error('交通データの取得に失敗しました', error);
    this.errorSignal.set('交通データの取得に失敗しました');
  } finally {
    this.loadingSignal.set(false);
  }
}
```

- サービスはステートレスでデータ取得や処理に集中
- ストアはサービスと連携してデータを取得し、状態として保持する
- エラー処理と読み込み状態の管理を担当

## 状態管理のベストプラクティス

1. **最小の状態設計**:
   - 必要最小限の状態のみを保持
   - 派生可能なデータはcomputedシグナルで計算

2. **一貫性のある状態更新**:
   - 関連する複数のシグナルを更新する場合は一貫性に注意
   - トランザクション的な更新パターンを検討

3. **非同期処理のパターン**:
   - 開始時にloading=true、error=null
   - 完了時にデータを設定
   - エラー時にerrorを設定
   - 最終的にloading=false（finallyブロックで）

4. **状態の初期化と破棄**:
   - 適切な初期値を設定
   - 必要に応じてクリーンアップメソッドを提供

## テスト戦略

1. **ストア単体テスト**:
   - シグナル更新の確認
   - アクションメソッドの動作確認
   - 依存サービスをモック化

2. **統合テスト**:
   - コンポーネントとストアの連携を確認
   - fakeAsyncとtickを使用した非同期テスト

## ストアのスケーラビリティ考慮事項

1. **状態の分割**:
   - 機能ごとに個別のストアを作成
   - 関連する状態をグループ化

2. **パフォーマンス最適化**:
   - 不必要な再計算を避けるためのメモ化
   - 大きなデータセットの効率的な処理

3. **デバッグ容易性**:
   - 明確なアクションメソッド名
   - 状態変更の追跡しやすさ
