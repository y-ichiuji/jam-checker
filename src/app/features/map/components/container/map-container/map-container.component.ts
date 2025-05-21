import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';

import { FeatureCollection } from '../../../../../models/geojson.model';
import {
  MapBounds,
  MapTransform,
  PanEvent,
  ZoomEvent,
  createInitialTransform,
} from '../../../models/map-transform.model';
import { MapService } from '../../../services/map.service';
import { MapViewComponent } from '../../presentation/map-view/map-view.component';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [MapViewComponent],
  templateUrl: './map-container.component.html',
  styles: ``,
})
export class MapContainerComponent implements OnInit, AfterViewInit {
  private mapService = inject(MapService);

  // 状態管理のためのシグナル
  private readonly mapDataSignal = signal<FeatureCollection | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly mapTransformSignal = signal<MapTransform>(createInitialTransform());
  private readonly mapBoundsSignal = signal<MapBounds | null>(null);

  // 公開用の読み取り専用シグナル
  protected readonly mapData = this.mapDataSignal.asReadonly();
  protected readonly loading = this.loadingSignal.asReadonly();
  protected readonly error = this.errorSignal.asReadonly();
  protected readonly mapTransform = this.mapTransformSignal.asReadonly();
  protected readonly mapBounds = this.mapBoundsSignal.asReadonly();

  ngOnInit(): void {
    // コンポーネント初期化時に地図データを取得
    this.loadMapData();
  }

  ngAfterViewInit(): void {
    // DOMが描画された後に変換制限を設定
    this.updateTransformLimits();
  }

  protected async loadMapData(): Promise<void> {
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // MapServiceからデータを取得
      const data = await this.mapService.fetchWorldMapData();
      this.mapDataSignal.set(data);
    } catch (error) {
      console.error('地図データの取得に失敗しました', error);
      this.errorSignal.set('地図データの取得に失敗しました');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  protected handleMapClick(event: { x: number; y: number }): void {
    console.log('Map clicked at:', event);
  }

  /**
   * パン操作イベントをハンドリング
   */
  protected handlePan(event: PanEvent): void {
    // 移動量の累積を追跡するための値
    let accumulatedDeltaX = 0;
    let accumulatedDeltaY = 0;

    this.mapTransformSignal.update(transform => {
      // 新しいオフセットを計算（移動累積量を追加）
      const newOffsetX = transform.offsetX + event.deltaX;
      const newOffsetY = transform.offsetY + event.deltaY;

      // 移動量を累積
      accumulatedDeltaX += event.deltaX;
      accumulatedDeltaY += event.deltaY;

      // 制限内に収める
      const constrainedOffsetX = Math.max(
        -transform.maxOffsetX,
        Math.min(transform.maxOffsetX, newOffsetX)
      );
      const constrainedOffsetY = Math.max(
        -transform.maxOffsetY,
        Math.min(transform.maxOffsetY, newOffsetY)
      );

      return {
        ...transform,
        offsetX: constrainedOffsetX,
        offsetY: constrainedOffsetY,
      };
    });

    // 大きな移動の後に変換制限を更新
    if (Math.abs(accumulatedDeltaX) > 50 || Math.abs(accumulatedDeltaY) > 50) {
      this.updateTransformLimits();
    }
  }

  /**
   * ズーム操作イベントをハンドリング
   */
  protected handleZoom(event: ZoomEvent): void {
    this.mapTransformSignal.update(transform => {
      // 新しいスケールを計算（最小・最大の制限内に収める）
      const newScale = Math.max(
        transform.minScale,
        Math.min(transform.maxScale, transform.scale * event.deltaScale)
      );

      // スケール変更による座標のずれを補正
      // ズームの中心点が固定されるように調整
      const scaleFactor = newScale / transform.scale;
      const offsetX = event.centerX - (event.centerX - transform.offsetX) * scaleFactor;
      const offsetY = event.centerY - (event.centerY - transform.offsetY) * scaleFactor;

      // オフセットを制限内に収める
      const constrainedOffsetX = Math.max(
        -transform.maxOffsetX,
        Math.min(transform.maxOffsetX, offsetX)
      );
      const constrainedOffsetY = Math.max(
        -transform.maxOffsetY,
        Math.min(transform.maxOffsetY, offsetY)
      );

      return {
        ...transform,
        scale: newScale,
        offsetX: constrainedOffsetX,
        offsetY: constrainedOffsetY,
      };
    });

    // ズーム操作後に変換制限を更新
    this.updateTransformLimits();
  }

  /**
   * 変換制限を更新する
   * キャンバスサイズとスケールに基づいて動的に最大オフセットを計算
   */
  private updateTransformLimits(): void {
    const canvasElement = document.querySelector('canvas');
    let canvasWidth = 1000; // デフォルト値
    let canvasHeight = 800; // デフォルト値

    if (canvasElement) {
      canvasWidth = canvasElement.width || canvasWidth;
      canvasHeight = canvasElement.height || canvasHeight;
    }

    const currentScale = this.mapTransformSignal().scale;
    // スケールに応じて制限を調整（より大きいスケールではより大きい移動を許可）
    const maxOffsetX = Math.max(500, canvasWidth * 0.6 * currentScale);
    const maxOffsetY = Math.max(500, canvasHeight * 0.6 * currentScale);

    this.mapTransformSignal.update(transform => ({
      ...transform,
      maxOffsetX,
      maxOffsetY,
    }));
  }

  /**
   * 地図の境界情報を設定
   */
  protected handleMapBoundsChange(bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }): void {
    this.mapBoundsSignal.set(bounds);
  }

  /**
   * 初期変換情報を処理する
   * MapViewComponentから送信された初期スケールとオフセットを適用
   */
  protected handleInitialTransformChange(transform: MapTransform): void {
    this.mapTransformSignal.set(transform);
    // 変換制限も更新
    this.updateTransformLimits();
  }

  /**
   * 地図の変換情報をリセット
   */
  protected resetMapTransform(): void {
    this.mapTransformSignal.set(createInitialTransform());
    this.updateTransformLimits();
  }
}
