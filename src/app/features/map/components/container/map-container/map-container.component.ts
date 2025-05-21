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
import { CanvasInfo, MapViewComponent } from '../../presentation/map-view/map-view.component';

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
  /** キャンバス高さに対するオフセット制限の比率 */
  CANVAS_HEIGHT_OFFSET_RATIO: 0.6,
  /** 現在地表示時のスケール */
  CURRENT_LOCATION_SCALE: 100,
  /** 再試行の待機時間（ミリ秒） */
  RETRY_DELAY_MS: 100,
  /** 位置情報取得の高精度モード */
  GEO_HIGH_ACCURACY: true,
  /** 位置情報取得のタイムアウト（ミリ秒） */
  GEO_TIMEOUT_MS: 10000,
  /** 位置情報キャッシュの最大有効期間（ミリ秒） */
  GEO_MAX_AGE_MS: 0,
  /** 緯度原点のオフセット（北緯90度） */
  LATITUDE_OFFSET: 90,
};

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
  private readonly canvasInfoSignal = signal<CanvasInfo>({
    width: MAP_CONTAINER_CONSTANTS.DEFAULT_CANVAS_WIDTH,
    height: MAP_CONTAINER_CONSTANTS.DEFAULT_CANVAS_HEIGHT,
  }); // デフォルト値

  // 公開用の読み取り専用シグナル
  protected readonly mapData = this.mapDataSignal.asReadonly();
  protected readonly loading = this.loadingSignal.asReadonly();
  protected readonly error = this.errorSignal.asReadonly();
  protected readonly mapTransform = this.mapTransformSignal.asReadonly();
  protected readonly mapBounds = this.mapBoundsSignal.asReadonly();
  protected readonly canvasInfo = this.canvasInfoSignal.asReadonly();

  /**
   * キャンバス情報変更イベントを処理する
   * MapViewComponentから受け取ったキャンバスサイズ情報を保存する
   */
  protected handleCanvasInfoChange(info: CanvasInfo): void {
    this.canvasInfoSignal.set(info);
    // キャンバスサイズが変わったら変換制限も更新
    this.updateTransformLimits();
  }

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
    if (
      Math.abs(accumulatedDeltaX) > MAP_CONTAINER_CONSTANTS.LARGE_PAN_THRESHOLD ||
      Math.abs(accumulatedDeltaY) > MAP_CONTAINER_CONSTANTS.LARGE_PAN_THRESHOLD
    ) {
      this.updateTransformLimits();
    }
  }

  /**
   * ズーム操作イベントをハンドリング
   */
  protected handleZoom(event: ZoomEvent): void {
    this.mapTransformSignal.update(transform => {
      // 新しいスケールを計算（最小・最大の制限内に収める）
      // 最小スケールは createInitialTransform() で設定された値と
      // setInitialPositionToCurrentLocation で設定された値の小さい方を使用
      const effectiveMinScale = Math.min(transform.minScale, MAP_CONTAINER_CONSTANTS.MIN_SCALE);
      const newScale = Math.max(
        effectiveMinScale,
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
    // 保存されたキャンバス情報を使用
    const canvasInfo = this.canvasInfoSignal();
    const canvasWidth = canvasInfo.width;
    const canvasHeight = canvasInfo.height;

    const currentScale = this.mapTransformSignal().scale;
    // スケールに応じて制限を調整（より大きいスケールではより大きい移動を許可）
    const maxOffsetX = Math.max(
      MAP_CONTAINER_CONSTANTS.BASE_OFFSET_LIMIT,
      canvasWidth * MAP_CONTAINER_CONSTANTS.CANVAS_WIDTH_OFFSET_RATIO * currentScale
    );
    const maxOffsetY = Math.max(
      MAP_CONTAINER_CONSTANTS.BASE_OFFSET_LIMIT,
      canvasHeight * MAP_CONTAINER_CONSTANTS.CANVAS_HEIGHT_OFFSET_RATIO * currentScale
    );

    this.mapTransformSignal.update(transform => ({
      ...transform,
      maxOffsetX,
      maxOffsetY,
    }));

    // キャンバス情報を更新
    this.canvasInfoSignal.set({ width: canvasWidth, height: canvasHeight });

    // キャンバス情報を更新
    this.canvasInfoSignal.set({ width: canvasWidth, height: canvasHeight });
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
          enableHighAccuracy: MAP_CONTAINER_CONSTANTS.GEO_HIGH_ACCURACY,
          timeout: MAP_CONTAINER_CONSTANTS.GEO_TIMEOUT_MS,
          maximumAge: MAP_CONTAINER_CONSTANTS.GEO_MAX_AGE_MS,
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
        // 保存されたキャンバス情報を使用
        const canvasInfo = this.canvasInfoSignal();
        if (canvasInfo.width <= 0 || canvasInfo.height <= 0) {
          // キャンバス情報がまだ有効でない場合は少し待ってから再試行
          setTimeout(waitForMapData, MAP_CONTAINER_CONSTANTS.RETRY_DELAY_MS);
          return;
        }

        const canvasWidth = canvasInfo.width;
        const canvasHeight = canvasInfo.height;

        // スケールの設定（都市レベルの詳細度に適した値）
        const scale = MAP_CONTAINER_CONSTANTS.CURRENT_LOCATION_SCALE;

        // 緯度経度を画面座標に変換
        // MapViewComponent.projectPointと同じロジックで変換
        const pointX = longitude * scale;
        const pointY = (MAP_CONTAINER_CONSTANTS.LATITUDE_OFFSET - latitude) * scale;

        // 現在地が画面中央に来るようオフセットを計算
        const offsetX = canvasWidth / 2 - pointX;
        const offsetY = canvasHeight / 2 - pointY;

        this.mapTransformSignal.update(transform => ({
          ...transform,
          scale: scale,
          offsetX: offsetX,
          offsetY: offsetY,
          // マップ全体の表示できるように最小スケールを小さく設定
          minScale: MAP_CONTAINER_CONSTANTS.MIN_SCALE,
        }));

        // マップの再描画をトリガー
        this.forceMapRedraw();
      } else {
        // マップデータがまだ読み込まれていない場合は少し待ってから再試行
        setTimeout(waitForMapData, MAP_CONTAINER_CONSTANTS.RETRY_DELAY_MS);
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
