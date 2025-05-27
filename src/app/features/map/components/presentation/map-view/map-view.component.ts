import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { Subscription, fromEvent, merge } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap, throttleTime } from 'rxjs/operators';

import { LoadingViewComponent } from '../../../../../components/ui/loading-view/loading-view.component';
import { getTrafficLevelColor } from '../../../../../features/jam/models/traffic-level.model';
import { Feature, FeatureCollection, Position } from '../../../../../models/geojson.model';
import { TileBounds } from '../../../models/map-tile.model';
import {
  MapBounds,
  MapTransform,
  PanEvent,
  ZoomEvent,
  createInitialTransform,
} from '../../../models/map-transform.model';
import { RoadPopup } from '../../../models/road-popup.model';
import { TileManagerService } from '../../../services/tile-manager.service';
import { TileRendererService } from '../../../services/tile-renderer.service';
import { MapErrorViewComponent } from '../map-error-view/map-error-view.component';
import { getTrafficLevelLabel, setRoadStyleByTrafficLevel } from './road-style.helper';

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
  /** 最小スケール計算係数（0.9 = 自動計算した90%） */
  MIN_SCALE_FACTOR: 0.9,
  /** Y軸方向の上下オフセット調整係数（0.1 = 画面高さの10%） */
  Y_OFFSET_ADJUSTMENT: 0.1,
  /** ポインターイベントの間引き時間（ミリ秒、16ms ≒ 60fps） */
  POINTER_THROTTLE_MS: 16,
  /** ポリゴン描画の線幅 */
  POLYGON_LINE_WIDTH: 0.8,
  /** ポリゴン塗りつぶし色 */
  POLYGON_FILL_COLOR: 'rgba(230, 245, 255, 0.8)',
  /** ポリゴン線の色 */
  POLYGON_STROKE_COLOR: 'rgba(50, 120, 180, 0.9)',
  /** 線の色 */
  LINE_STROKE_COLOR: 'rgba(255, 0, 0, 0.8)',
  /** 線の幅 */
  LINE_WIDTH: 2,
  /** 緯度原点のオフセット（北緯90度） */
  LATITUDE_OFFSET: 90,
};

// canvasサイズ情報のインターフェース
export interface CanvasInfo {
  width: number;
  height: number;
}

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [LoadingViewComponent, MapErrorViewComponent],
  templateUrl: './map-view.component.html',
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapCanvas') mapCanvasRef!: ElementRef<HTMLCanvasElement>;

  // 入力シグナル - 地図データを受け取る
  readonly mapData = input<FeatureCollection | null>(null);

  // 入力シグナル - 道路データを受け取る
  readonly roadData = input<FeatureCollection | null>(null);

  // 入力シグナル - 道路吹き出しデータを受け取る
  readonly roadPopup = input<RoadPopup | null>(null);

  // 入力シグナル - 交通混雑情報を受け取る
  readonly trafficData = input<Array<{ roadFeature: Feature; trafficLevel: number }>>();

  // 入力シグナル - 読み込み中状態
  readonly loading = input<boolean>(false);

  // 入力シグナル - エラー状態
  readonly error = input<string | null>(null);

  // 入力シグナル - 地図変換情報
  readonly transform = input<MapTransform>(createInitialTransform());

  // 出力シグナル - クリックイベントを発信
  readonly mapClick = output<{ x: number; y: number }>();

  // 出力シグナル - 再試行イベントを発信
  readonly retryLoad = output<void>();

  // 出力シグナル - パンイベントを発信
  readonly panEvent = output<PanEvent>();

  // 出力シグナル - ズームイベントを発信
  readonly zoomEvent = output<ZoomEvent>();

  // 出力シグナル - マップ境界変更イベントを発信
  readonly boundsChange = output<MapBounds>();

  // 出力シグナル - 初期変換情報を発信（自動スケーリング後）
  readonly initialTransformChange = output<MapTransform>();

  // 出力シグナル - キャンバス情報を親コンポーネントに発信
  readonly canvasInfoChange = output<CanvasInfo>();

  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // ドラッグ操作用の変数
  private isDragging = false;

  // RxJSのサブスクリプション管理
  private subscriptions = new Subscription();

  private tileManagerService = inject(TileManagerService);
  private tileRendererService = inject(TileRendererService);

  constructor() {
    // 地図データの変更を監視
    effect(() => {
      const data = this.mapData();
      if (data && this.context) {
        this.tileManagerService.resetTiles();
        this.drawMap();

        // 地図の境界計算
        const bounds = this.calculateBounds(data);
        if (bounds) {
          this.boundsChange.emit(bounds);
        }
      }
    });

    // 道路データの変更を監視
    effect(() => {
      const roadData = this.roadData();
      if (roadData && this.context) {
        this.tileManagerService.resetTiles();
        this.drawMap();
      }
    });

    // 交通データの変更を監視
    effect(() => {
      const trafficData = this.trafficData();
      if (trafficData && this.context) {
        this.drawMap();
      }
    });

    // 変換情報の変更を監視
    effect(() => {
      this.transform();
      if ((this.mapData() || this.roadData()) && this.context) {
        this.drawMap();
      }
    });

    // 吹き出し情報の変更を監視
    effect(() => {
      this.roadPopup(); // 依存関係を確立しますが、値は後でdrawMap内で使用
      if (this.context) {
        this.drawMap(); // 吹き出しの状態変更時にマップを再描画
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    // ResizeObserverの監視を解除
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // RxJSサブスクリプションの解除
    this.subscriptions.unsubscribe();
  }

  private initializeCanvas(): void {
    const canvas = this.mapCanvasRef.nativeElement;
    this.context = canvas.getContext('2d');

    // キャンバスのサイズを設定
    this.resizeCanvas();

    // ResizeObserverを設定
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });

    // キャンバスの親要素を監視
    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  private resizeCanvas(): void {
    if (!this.context) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const parent = canvas.parentElement;

    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // サイズ変更後に地図を再描画
      if (this.mapData() || this.roadData()) {
        this.drawMap();
      }

      // キャンバス情報を発信
      this.canvasInfoChange.emit({ width: canvas.width, height: canvas.height });
    }
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    const canvas = this.mapCanvasRef?.nativeElement;
    if (!canvas) return;

    // マウスホイールイベント（これはポインターイベントに含まれないため別処理）
    this.subscriptions.add(
      fromEvent<WheelEvent>(canvas, 'wheel')
        .pipe(
          tap(event => {
            event.preventDefault();
            return true;
          }),
          map(event => {
            const rect = canvas.getBoundingClientRect();
            // マウス位置をキャンバス座標系に変換
            const mouseX = event.clientX - rect.left;
            const mouseY = event.clientY - rect.top;

            // ズーム量の計算（正: 拡大、負: 縮小）
            const zoomDirection = event.deltaY < 0 ? 1 : -1;
            const zoomFactor = 1 + zoomDirection * MAP_VIEW_CONSTANTS.ZOOM_FACTOR;

            return {
              deltaScale: zoomFactor,
              centerX: mouseX,
              centerY: mouseY,
            } as ZoomEvent;
          })
        )
        .subscribe(zoomEvent => {
          this.zoomEvent.emit(zoomEvent);
        })
    );

    // ポインターダウンイベント（マウスダウン/タッチスタート）
    this.subscriptions.add(
      fromEvent<PointerEvent>(canvas, 'pointerdown')
        .pipe(
          tap(event => {
            event.preventDefault();
            // タッチ操作の時は特に必要
            canvas.setPointerCapture(event.pointerId);
            this.isDragging = true;
            return true;
          }),
          switchMap(() =>
            fromEvent<PointerEvent>(canvas, 'pointermove').pipe(
              // 高頻度のイベントを間引く
              throttleTime(MAP_VIEW_CONSTANTS.POINTER_THROTTLE_MS),
              // pointerup または pointercancel で終了
              takeUntil(
                merge(
                  fromEvent<PointerEvent>(canvas, 'pointerup'),
                  fromEvent<PointerEvent>(canvas, 'pointercancel')
                )
              ),
              map(moveEvent => {
                // ネイティブのmovementX/Yプロパティを使用して移動量を取得
                return {
                  deltaX: moveEvent.movementX,
                  deltaY: moveEvent.movementY,
                };
              })
            )
          )
        )
        .subscribe(delta => {
          // パンイベントを発行
          this.panEvent.emit(delta);
        })
    );

    // ポインターアップイベント（マウスアップ/タッチエンド）
    this.subscriptions.add(
      merge(
        fromEvent<PointerEvent>(canvas, 'pointerup'),
        fromEvent<PointerEvent>(canvas, 'pointercancel')
      ).subscribe((event: PointerEvent) => {
        // ドラッグ処理終了
        this.isDragging = false;

        // ポインターキャプチャを解放
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // pointercancel の場合にエラーになることがあるため無視
        }
      })
    );

    // クリックイベント（短時間の操作の場合のみ）
    this.subscriptions.add(
      fromEvent<PointerEvent>(canvas, 'click')
        .pipe(
          filter(() => !this.isDragging) // ドラッグ操作の直後のクリックは無視
        )
        .subscribe(event => {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          this.mapClick.emit({ x, y });
        })
    );
  }

  /**
   * 現在のビューポートの境界を計算
   */
  private calculateViewportBounds(transform: MapTransform, canvas: HTMLCanvasElement): TileBounds {
    // キャンバス座標から地理座標への変換
    const canvasToGeo = (x: number, y: number): { longitude: number; latitude: number } => {
      const longitude = (x - transform.offsetX) / transform.scale;
      const latitude = 90 - (y - transform.offsetY) / transform.scale;
      return { longitude, latitude };
    };

    // ビューポートの四隅の座標を計算
    const topLeft = canvasToGeo(0, 0);
    const bottomRight = canvasToGeo(canvas.width, canvas.height);

    return {
      minLon: Math.min(topLeft.longitude, bottomRight.longitude),
      maxLon: Math.max(topLeft.longitude, bottomRight.longitude),
      minLat: Math.min(topLeft.latitude, bottomRight.latitude),
      maxLat: Math.max(topLeft.latitude, bottomRight.latitude),
    };
  }

  /**
   * 地図データをキャンバスに描画する
   */
  private drawMap(): void {
    const mapData = this.mapData();
    const roadData = this.roadData();
    const roadPopup = this.roadPopup();
    const trafficInfoList = this.trafficData();
    if (!this.context || (!mapData && !roadData)) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const ctx = this.context;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 現在の変換情報を取得
    const currentTransform = this.transform();

    // タイルの初期化（必要な場合）
    if (mapData && !this.tileManagerService.hasTiles()) {
      this.tileManagerService.initializeTiles(mapData);
    }
    if (roadData && !this.tileManagerService.hasRoadTiles()) {
      this.tileManagerService.initializeRoadTiles(roadData);
    }

    // 現在のビューポートを計算
    const viewport = this.calculateViewportBounds(currentTransform, canvas);

    // 交通混雑情報のマップを作成
    const trafficMap = new Map<string, number>();
    if (trafficInfoList) {
      trafficInfoList.forEach(info => {
        const id = info.roadFeature.properties?.['N12_005'] || info.roadFeature.id;
        if (id) {
          trafficMap.set(id.toString(), info.trafficLevel);
        }
      });
    }

    // タイルをリセット
    this.tileManagerService.resetTiles();

    // ビューポート内のタイルを描画
    const visibleTiles = this.tileManagerService.getTilesInViewport(viewport);
    visibleTiles.forEach(tile => {
      if (!tile.isRendered()) {
        this.tileRendererService.renderTile(ctx, tile, currentTransform, trafficMap);
      }
    });

    // 道路タイルを描画
    const visibleRoadTiles = this.tileManagerService.getRoadTilesInViewport(viewport);
    visibleRoadTiles.forEach(tile => {
      if (!tile.isRendered()) {
        this.tileRendererService.renderTile(ctx, tile, currentTransform, trafficMap);
      }
    });

    // 吹き出しの描画（あれば）
    if (roadPopup) {
      this.drawRoadPopup(roadPopup, ctx);
    }
  }

  /**
   * 変換情報を適用してGeoJSONデータをキャンバスに描画する
   */
  private drawGeoJSONWithTransform(
    geojson: FeatureCollection,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    transform: MapTransform
  ): void {
    // 地図の境界を計算
    const bounds = this.calculateBounds(geojson);
    if (!bounds) return;

    // 初回表示の場合のみ自動スケーリングを行う
    let scale = transform.scale;
    let offsetX = transform.offsetX;
    let offsetY = transform.offsetY;

    // スケールとオフセットが初期値の場合は自動調整
    if (scale === 1 && offsetX === 0 && offsetY === 0) {
      // 通常の自動スケーリング（全体表示）
      // 縮尺の計算（キャンバスに合わせる）
      const scaleX =
        (canvas.width / (bounds.maxX - bounds.minX)) * MAP_VIEW_CONSTANTS.MAP_WIDTH_SCALE_FACTOR;
      const scaleY =
        (canvas.height / (bounds.maxY - bounds.minY)) * MAP_VIEW_CONSTANTS.MAP_HEIGHT_SCALE_FACTOR;
      scale = Math.min(scaleX, scaleY); // 小さい方を採用して縦横比を保持

      // 中心位置の調整
      offsetX = canvas.width / 2 - ((bounds.maxX + bounds.minX) / 2) * scale;
      // 世界地図は画面中央よりやや上に配置
      offsetY =
        canvas.height / 2 -
        ((bounds.maxY + bounds.minY) / 2) * scale -
        canvas.height * MAP_VIEW_CONSTANTS.Y_OFFSET_ADJUSTMENT;

      // 最小スケールは自動計算されたスケールの90%に設定（全体が見えるように）
      const calculatedMinScale = scale * MAP_VIEW_CONSTANTS.MIN_SCALE_FACTOR;

      // 親コンポーネントに初期変換情報を通知
      this.initialTransformChange.emit({
        ...transform,
        scale,
        offsetX,
        offsetY,
        minScale: calculatedMinScale,
      });
    }

    // 各フィーチャーを描画
    geojson.features.forEach(feature => {
      if (!feature.geometry) return;

      ctx.beginPath();

      switch (feature.geometry.type) {
        case 'Polygon':
          this.drawPolygon(feature.geometry.coordinates, ctx, scale, offsetX, offsetY);
          break;
        case 'MultiPolygon':
          this.drawMultiPolygon(feature.geometry.coordinates, ctx, scale, offsetX, offsetY);
          break;
        case 'LineString':
          this.drawLineString(feature.geometry.coordinates, ctx, scale, offsetX, offsetY);
          break;
        case 'MultiLineString':
          this.drawMultiLineString(feature.geometry.coordinates, ctx, scale, offsetX, offsetY);
          break;
        // 他の形状が必要な場合はここに追加
      }

      // 形状によって描画スタイルを変える
      if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
        // 線のスタイル
        ctx.strokeStyle = MAP_VIEW_CONSTANTS.LINE_STROKE_COLOR;
        ctx.lineWidth = MAP_VIEW_CONSTANTS.LINE_WIDTH;
        ctx.stroke();
      } else {
        // ポリゴンのスタイル
        ctx.fillStyle = MAP_VIEW_CONSTANTS.POLYGON_FILL_COLOR;
        ctx.strokeStyle = MAP_VIEW_CONSTANTS.POLYGON_STROKE_COLOR;
        ctx.lineWidth = MAP_VIEW_CONSTANTS.POLYGON_LINE_WIDTH;
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  /**
   * 道路GeoJSONデータを描画する
   */
  private drawRoadGeoJSON(
    roadData: FeatureCollection,
    ctx: CanvasRenderingContext2D,
    transform: MapTransform
  ): void {
    const scale = transform.scale;
    const offsetX = transform.offsetX;
    const offsetY = transform.offsetY;

    // 交通混雑データの取得
    const trafficInfoList = this.trafficData();

    // RoadFeature から ID へのマッピングを構築
    const trafficMap = new Map<string, number>();
    if (trafficInfoList) {
      trafficInfoList.forEach(info => {
        const id = info.roadFeature.properties?.['N12_005'] || info.roadFeature.id;
        if (id) {
          trafficMap.set(id.toString(), info.trafficLevel);
        }
      });
    }

    // 各フィーチャーを描画
    roadData.features.forEach(feature => {
      if (!feature.geometry) return;

      ctx.beginPath();

      switch (feature.geometry.type) {
        case 'LineString':
          this.drawLineString(feature.geometry.coordinates, ctx, scale, offsetX, offsetY);
          break;
        case 'MultiLineString':
          this.drawMultiLineString(feature.geometry.coordinates, ctx, scale, offsetX, offsetY);
          break;
      }

      // 道路IDから交通混雑レベルを取得
      const roadId = feature.properties?.['N12_005'] || feature.id;
      if (roadId && trafficMap.has(roadId.toString())) {
        // 交通混雑データに基づいて色と線幅を設定
        const level = trafficMap.get(roadId.toString()) || 0;

        // 交通混雑レベルに応じた色を設定（0-10のレベルに基づく）
        setRoadStyleByTrafficLevel(ctx, level);
      } else {
        // デフォルトスタイル（交通データがない場合）
        ctx.strokeStyle = MAP_VIEW_CONSTANTS.LINE_STROKE_COLOR;
        ctx.lineWidth = MAP_VIEW_CONSTANTS.LINE_WIDTH;
      }

      ctx.stroke();
    });
  }

  /**
   * LineStringを描画する
   */
  private drawLineString(
    coordinates: Position[],
    ctx: CanvasRenderingContext2D,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    if (coordinates.length === 0) return;

    // 最初の点に移動
    const firstPoint = coordinates[0];
    if (!firstPoint) return;

    const start = this.projectPoint(firstPoint, scale, offsetX, offsetY);
    ctx.moveTo(start.x, start.y);

    // 残りの点をつなぐ
    for (let i = 1; i < coordinates.length; i++) {
      const pointCoord = coordinates[i];
      if (!pointCoord) continue;

      const point = this.projectPoint(pointCoord, scale, offsetX, offsetY);
      ctx.lineTo(point.x, point.y);
    }
  }

  /**
   * MultiLineStringを描画する
   */
  private drawMultiLineString(
    coordinates: Position[][],
    ctx: CanvasRenderingContext2D,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    coordinates.forEach(lineString => {
      this.drawLineString(lineString, ctx, scale, offsetX, offsetY);
    });
  }

  /**
   * ポリゴンを描画する
   */
  private drawPolygon(
    coordinates: Position[][],
    ctx: CanvasRenderingContext2D,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    coordinates.forEach(ring => {
      if (ring.length === 0) return;

      // TypeScript型チェック対応
      const firstPoint = ring[0];
      if (!firstPoint) return;

      // 最初の点に移動
      const start = this.projectPoint(firstPoint, scale, offsetX, offsetY);
      ctx.moveTo(start.x, start.y);

      // 残りの点をつなぐ
      for (let i = 1; i < ring.length; i++) {
        const pointCoord = ring[i];
        if (!pointCoord) continue;

        const point = this.projectPoint(pointCoord, scale, offsetX, offsetY);
        ctx.lineTo(point.x, point.y);
      }

      // パスを閉じる
      ctx.closePath();
    });
  }

  /**
   * マルチポリゴンを描画する
   */
  private drawMultiPolygon(
    coordinates: Position[][][],
    ctx: CanvasRenderingContext2D,
    scale: number,
    offsetX: number,
    offsetY: number
  ): void {
    coordinates.forEach(polygon => {
      this.drawPolygon(polygon, ctx, scale, offsetX, offsetY);
    });
  }

  /**
   * 座標点をキャンバス座標に変換
   */
  private projectPoint(
    position: Position,
    scale: number,
    offsetX: number,
    offsetY: number
  ): { x: number; y: number } {
    // 日本の地図に最適化された投影（単純な緯度経度の変換）
    const [longitude, latitude] = position;

    // 経度は東に行くほど大きくなり、緯度は北に行くほど大きくなる
    // canvas座標系は左上が原点で、右下に向かって増加する
    return {
      x: longitude * scale + offsetX,
      y: (MAP_VIEW_CONSTANTS.LATITUDE_OFFSET - latitude) * scale + offsetY, // 緯度は90から引く（北半球の場合）
    };
  }

  /**
   * GeoJSONの境界を計算
   */
  private calculateBounds(
    geojson: FeatureCollection
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // 全ての座標を走査して最小値と最大値を求める
    const processPosition = (position: Position): void => {
      const [x, y] = position;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    };

    const processLineString = (coordinates: Position[]): void => {
      coordinates.forEach(processPosition);
    };

    const processMultiLineString = (coordinates: Position[][]): void => {
      coordinates.forEach(processLineString);
    };

    const processPolygon = (coordinates: Position[][]): void => {
      coordinates.forEach(ring => {
        ring.forEach(processPosition);
      });
    };

    const processMultiPolygon = (coordinates: Position[][][]): void => {
      coordinates.forEach(processPolygon);
    };

    geojson.features.forEach(feature => {
      if (!feature.geometry) return;

      switch (feature.geometry.type) {
        case 'LineString':
          processLineString(feature.geometry.coordinates);
          break;
        case 'MultiLineString':
          processMultiLineString(feature.geometry.coordinates);
          break;
        case 'Polygon':
          processPolygon(feature.geometry.coordinates);
          break;
        case 'MultiPolygon':
          processMultiPolygon(feature.geometry.coordinates);
          break;
        // 他の形状が必要な場合はここに追加
      }
    });

    return minX === Infinity ? null : { minX, minY, maxX, maxY };
  }

  /**
   * 道路名吹き出しを描画
   * @param popup 吹き出し情報
   * @param ctx キャンバスコンテキスト
   */
  private drawRoadPopup(popup: RoadPopup, ctx: CanvasRenderingContext2D): void {
    const { x, y, roadName, trafficLevel } = popup;

    // 表示するテキストを準備（交通混雑情報がある場合は追加）
    const lines: string[] = [roadName];

    if (trafficLevel !== undefined) {
      // ヘルパー関数を使用して交通レベルのラベルを取得
      const label = getTrafficLevelLabel(trafficLevel);
      lines.push(`交通状況: ${label}`);
    }

    // 吹き出しの設定
    const padding = 10;
    const borderRadius = 5;
    const arrowHeight = 10;
    const arrowWidth = 15;
    const fontSize = 14;
    const lineHeight = fontSize * 1.2; // 行間
    ctx.font = `${fontSize}px Arial, sans-serif`;

    // テキスト測定
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const textHeight = lineHeight * lines.length;

    // 吹き出しのサイズと位置計算
    const boxWidth = textWidth + padding * 5;
    const boxHeight = textHeight + padding * 2;
    const boxX = x - boxWidth / 2;
    const boxY = y - boxHeight - arrowHeight - 5; // 少し上に表示

    // 背景を描画（吹き出し本体）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 1;

    // 吹き出しの枠（角丸四角形）
    ctx.beginPath();
    ctx.moveTo(boxX + borderRadius, boxY);
    ctx.lineTo(boxX + boxWidth - borderRadius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + borderRadius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - borderRadius);
    ctx.quadraticCurveTo(
      boxX + boxWidth,
      boxY + boxHeight,
      boxX + boxWidth - borderRadius,
      boxY + boxHeight
    );

    // 吹き出しの矢印部分（右半分）
    const arrowTipX = x;
    const arrowBaseRightX = x + arrowWidth / 2;
    const arrowBaseY = boxY + boxHeight;
    ctx.lineTo(arrowBaseRightX, arrowBaseY);
    ctx.lineTo(arrowTipX, arrowBaseY + arrowHeight);

    // 吹き出しの矢印部分（左半分）
    const arrowBaseLeftX = x - arrowWidth / 2;
    ctx.lineTo(arrowBaseLeftX, arrowBaseY);

    // 吹き出しの枠（左下から左上まで）
    ctx.lineTo(boxX + borderRadius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - borderRadius);
    ctx.lineTo(boxX, boxY + borderRadius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + borderRadius, boxY);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // テキスト描画
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 複数行テキストの描画
    lines.forEach((line, index) => {
      const lineY = boxY + padding + index * lineHeight + fontSize / 2;

      // 交通状況表示行の場合はカラーインジケーターを追加
      if (index === 1 && trafficLevel !== undefined) {
        const textWidth = ctx.measureText(line).width;
        const statusStartX = x - textWidth / 2;

        // 交通レベルの色を直接取得（パフォーマンス最適化）
        const levelColor = getTrafficLevelColor(trafficLevel);

        // カラーマーカーを描画
        const markerSize = 8;
        const markerX = statusStartX - 5 - markerSize;
        const markerY = lineY;
        ctx.fillStyle = levelColor;
        ctx.beginPath();
        ctx.arc(markerX, markerY, markerSize / 2, 0, Math.PI * 2);
        ctx.fill();

        // テキスト色を元に戻す
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      }

      ctx.fillText(line, x, lineY);
    });
  }
}
