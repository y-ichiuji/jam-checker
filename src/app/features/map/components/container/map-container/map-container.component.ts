import { Component, OnInit, computed, inject, signal } from '@angular/core';

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
export class MapContainerComponent implements OnInit {
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

  // 変換情報が変更されたかどうかを計算するシグナル
  protected readonly hasTransformChanged = computed(() => {
    const transform = this.mapTransformSignal();
    const initialTransform = createInitialTransform();
    return (
      transform.scale !== initialTransform.scale ||
      transform.offsetX !== initialTransform.offsetX ||
      transform.offsetY !== initialTransform.offsetY
    );
  });

  ngOnInit(): void {
    // コンポーネント初期化時に地図データを取得
    this.loadMapData();
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
    this.mapTransformSignal.update(transform => ({
      ...transform,
      offsetX: transform.offsetX + event.deltaX,
      offsetY: transform.offsetY + event.deltaY,
    }));
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

      return {
        ...transform,
        scale: newScale,
        offsetX,
        offsetY,
      };
    });
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
   * 地図の変換情報をリセット
   */
  protected resetMapTransform(): void {
    this.mapTransformSignal.set(createInitialTransform());
  }
}
