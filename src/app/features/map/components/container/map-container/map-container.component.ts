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
    // 現在位置を取得する
    this.getCurrentLocation();
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

  /**
   * 現在の地理位置情報を取得する
   */
  private getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          // 現在位置の緯度・経度を取得
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          console.log('現在位置:', { latitude, longitude });

          // 現在位置をマップの初期表示位置として設定
          this.setInitialPositionToCurrentLocation(longitude, latitude);
        },
        error => {
          console.error('位置情報の取得に失敗しました', error);
          // エラー内容に応じたメッセージをコンソールに表示
          switch (error.code) {
            case error.PERMISSION_DENIED:
              console.warn('位置情報の使用が許可されていません');
              break;
            case error.POSITION_UNAVAILABLE:
              console.warn('位置情報が利用できません');
              break;
            case error.TIMEOUT:
              console.warn('位置情報の取得がタイムアウトしました');
              break;
            default:
              console.warn('位置情報の取得中に未知のエラーが発生しました');
          }
          // 位置情報が取得できない場合はデフォルト表示のままとする
        },
        // オプション：タイムアウトを10秒に設定、高精度モードを有効
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      console.error('このブラウザでは位置情報がサポートされていません');
      // Geolocationがサポートされていない場合はデフォルト表示
    }
  }

  /**
   * 現在位置を中心にマップの初期表示を設定する
   */
  private setInitialPositionToCurrentLocation(longitude: number, latitude: number): void {
    // マップデータが読み込まれるのを待つ
    const waitForMapData = (): void => {
      if (this.mapDataSignal()) {
        // キャンバス要素を取得してサイズを確認
        const canvasElement = document.querySelector('canvas');
        if (!canvasElement) {
          // キャンバスがまだない場合は少し待ってから再試行
          setTimeout(waitForMapData, 100);
          return;
        }

        const canvasWidth = canvasElement.width;
        const canvasHeight = canvasElement.height;

        // スケールの設定（都市レベルの詳細度に適した値）
        const scale = 200;

        // 緯度経度を画面座標に変換
        // MapViewComponent.projectPointと同じロジックで変換
        const pointX = longitude * scale;
        const pointY = (90 - latitude) * scale;

        // 現在地が画面中央に来るようオフセットを計算
        const offsetX = canvasWidth / 2 - pointX;
        const offsetY = canvasHeight / 2 - pointY;

        console.log('計算されたオフセット:', { offsetX, offsetY, scale }); // 現在位置を中心にした変換情報を設定
        this.mapTransformSignal.update(transform => ({
          ...transform,
          scale: scale,
          offsetX: offsetX,
          offsetY: offsetY,
          // マップ全体の表示より少し大きい最小スケールを設定
          minScale: 50,
        }));

        // マップの再描画をトリガー
        this.forceMapRedraw();
      } else {
        // マップデータがまだ読み込まれていない場合は少し待ってから再試行
        setTimeout(waitForMapData, 100);
      }
    };

    waitForMapData();
  }

  /**
   * マップを強制的に再描画する
   */
  private forceMapRedraw(): void {
    // 変換情報の更新と制限の更新
    this.updateTransformLimits();
  }
}
