# マップ操作とインタラクション仕様

## マップ操作の基本設計

Jam Checkerのマップ操作機能は、様々なデバイスとズームレベルで最適なユーザー体験を提供するために、以下の特徴を持つように設計されています。

### 基本操作

1. **ズーム機能**:
   - ホイールスクロールによるズームイン/ズームアウト
   - ピンチジェスチャー（タッチデバイス）でのズームイン/ズームアウト
   - ズーム中心点は現在のマウス/タッチ位置

2. **パン機能**:
   - ドラッグ操作によるマップの移動
   - ポインター移動量に基づく滑らかな移動
   - ズームレベルに応じた感度調整

3. **クリック操作**:
   - 道路のクリック検出と詳細情報表示
   - 微小な移動を伴うタップでもクリックとして検出
   - 最大クリック距離（MAX_CLICK_DISTANCE: 3px）と最大クリック時間（MAX_CLICK_DURATION: 250ms）の制限

### インタラクションの最適化

#### スケール対応の感度調整

マップのズームレベルに応じて、自動的にドラッグ操作の感度を調整します：

- **高ズームレベル（拡大時）**: 感度を下げて精密な操作を可能に
- **低ズームレベル（縮小時）**: 感度を上げて広範囲の移動を容易に

```typescript
/**
 * 現在のズームスケールに基づいて感度係数を計算する
 * 拡大しているほど（スケールが大きいほど）感度を下げて細かい操作を可能にし、
 * 縮小しているほど（スケールが小さいほど）感度を上げて広い範囲の移動を容易にする
 *
 * @param currentScale 現在のズームスケール
 * @returns スケールに応じた感度係数
 */
private calculateScaleBasedSensitivity(currentScale: number): number {
  // 対数スケールでの変換により、ズームレベルに応じた滑らかな感度調整を実現
  const scaleRatio = MAP_VIEW_CONSTANTS.REFERENCE_SCALE / Math.max(1, currentScale);

  // 感度調整にべき乗（SCALE_SENSITIVITY_FACTOR）を適用して非線形に調整
  return Math.pow(scaleRatio, MAP_VIEW_CONSTANTS.SCALE_SENSITIVITY_FACTOR);
}
```

#### 感度調整のための定数

```typescript
const MAP_VIEW_CONSTANTS = {
  /** ドラッグ操作の移動感度係数（値が大きいほど少ない動きで大きく移動） */
  DRAG_SENSITIVITY: 15.0,
  /** ズームレベルに応じたドラッグ感度の調整係数（値が小さいほど拡大時の移動量が小さくなる） */
  SCALE_SENSITIVITY_FACTOR: 0.4,
  /** 基準ズームレベル（このレベルでデフォルトの感度になる） */
  REFERENCE_SCALE: 20,
  // ...他の定数...
};
```

#### イベント処理の最適化

- **イベント間引き**: `throttleTime`を使用して高頻度イベントを最適化
- **ポインターキャプチャ**: ドラッグ中にポインターをキャプチャして操作の連続性を確保
- **非同期処理**: RxJSを使用した効率的なイベントストリーム処理

## マップ表示と変換

### 座標系と変換

地理座標系（経度・緯度）とピクセル座標系の間の変換は以下のように行われます：

1. **地理→ピクセル変換**:
   ```typescript
   const pixelX = longitude * transform.scale + transform.offsetX;
   const pixelY = (90 - latitude) * transform.scale + transform.offsetY;
   ```

2. **ピクセル→地理変換**:
   ```typescript
   const longitude = (pixelX - transform.offsetX) / transform.scale;
   const latitude = 90 - (pixelY - transform.offsetY) / transform.scale;
   ```

### 変換情報の管理

変換情報は`MapTransform`インターフェースで管理：

```typescript
export interface MapTransform {
  scale: number;        // 現在の拡大率
  offsetX: number;      // X軸オフセット
  offsetY: number;      // Y軸オフセット
  minScale: number;     // 最小拡大率
  maxScale: number;     // 最大拡大率
  maxOffsetX: number;   // X軸方向の最大オフセット
  maxOffsetY: number;   // Y軸方向の最大オフセット
}
```

### 初期値とスケーリングの設定

- **INITIAL_SCALE**: 20
- **MIN_SCALE**: 1.0
- **MAX_SCALE**: 20000
- **ZOOM_FACTOR**: 0.15（ズーム速度調整係数）

## 実装パターンと最適化

### イベント処理パターン

ポインター操作の処理パターンは以下のようになっています：

```typescript
fromEvent<PointerEvent>(canvas, 'pointerdown')
  .pipe(
    switchMap(() =>
      fromEvent<PointerEvent>(canvas, 'pointermove').pipe(
        throttleTime(MAP_VIEW_CONSTANTS.POINTER_THROTTLE_MS),
        takeUntil(
          merge(
            fromEvent<PointerEvent>(canvas, 'pointerup'),
            fromEvent<PointerEvent>(canvas, 'pointercancel')
          )
        ),
        map(moveEvent => {
          const scaleSensitivity = this.calculateScaleBasedSensitivity(
            this.transform().scale
          );
          return {
            deltaX: moveEvent.movementX * MAP_VIEW_CONSTANTS.DRAG_SENSITIVITY * scaleSensitivity,
            deltaY: moveEvent.movementY * MAP_VIEW_CONSTANTS.DRAG_SENSITIVITY * scaleSensitivity,
          };
        })
      )
    )
  )
  .subscribe(delta => {
    this.panEvent.emit(delta);
  })
```

### 最適化ポイント

1. **イベント間引き**:
   - `POINTER_THROTTLE_MS`: 16ms（約60fps）でポインター移動イベントを間引き

2. **感度調整の非線形性**:
   - ズームレベルに応じた非線形な感度調整により、どのズームレベルでも自然な操作感を実現
   - `SCALE_SENSITIVITY_FACTOR`: 0.4 によりべき乗の強さを調整

3. **クリック判定の精度**:
   - `MAX_CLICK_DISTANCE`: 3px（小さな値で精度向上）
   - `MAX_CLICK_DURATION`: 250ms（短いタッチ/クリック操作のみを検出）

4. **視覚的フィードバック**:
   - 道路クリック時の吹き出し表示によるユーザーアクション確認
   - リアルタイムのマップ移動によるインタラクション応答性

## 今後の改善点

1. **マルチタッチ対応の強化**:
   - ピンチジェスチャーによるズーム操作の最適化
   - 2本指による回転操作の追加（将来的な機能）

2. **慣性スクロール**:
   - 高速ドラッグ後の慣性効果の追加
   - スムーズな減速アニメーション

3. **デバイス最適化**:
   - タッチスクリーン固有の最適化
   - 高DPIディスプレイでのパフォーマンス向上

4. **アクセシビリティ対応**:
   - キーボードによるマップ操作
   - スクリーンリーダー対応
