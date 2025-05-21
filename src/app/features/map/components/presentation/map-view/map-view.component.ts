import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import { Subscription, fromEvent, merge } from 'rxjs';
import { filter, map, switchMap, takeUntil } from 'rxjs/operators';

import { LoadingViewComponent } from '../../../../../components/ui/loading-view/loading-view.component';
import { FeatureCollection, Position } from '../../../../../models/geojson.model';
import {
  MapBounds,
  MapTransform,
  PanEvent,
  ZoomEvent,
  createInitialTransform,
} from '../../../models/map-transform.model';
import { MapErrorViewComponent } from '../map-error-view/map-error-view.component';

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

  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // ドラッグ操作用の変数
  private isDragging = false;

  // RxJSのサブスクリプション管理
  private subscriptions = new Subscription();

  constructor() {
    // 地図データの変更を監視
    effect(() => {
      const data = this.mapData();
      if (data && this.context) {
        this.drawMap();

        // 地図の境界計算
        const bounds = this.calculateBounds(data);
        if (bounds) {
          this.boundsChange.emit(bounds);
        }
      }
    });

    // 変換情報の変更を監視
    effect(() => {
      this.transform();
      if (this.mapData() && this.context) {
        this.drawMap();
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
      if (this.mapData()) {
        this.drawMap();
      }
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
          filter(event => {
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
            const zoomFactor = 1 + zoomDirection * 0.1; // 10%ずつ拡大/縮小

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
          filter(event => {
            event.preventDefault();
            // タッチ操作の時は特に必要
            canvas.setPointerCapture(event.pointerId);
            this.isDragging = true;
            return true;
          }),
          switchMap(() =>
            fromEvent<PointerEvent>(canvas, 'pointermove').pipe(
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
   * 地図データをキャンバスに描画する
   */
  private drawMap(): void {
    const data = this.mapData();
    if (!data || !this.context) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const ctx = this.context;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 現在の変換情報を取得
    const currentTransform = this.transform();

    // GeoJSONの描画
    this.drawGeoJSONWithTransform(data, ctx, canvas, currentTransform);
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
      const scaleX = (canvas.width / (bounds.maxX - bounds.minX)) * 0.95;
      const scaleY = (canvas.height / (bounds.maxY - bounds.minY)) * 0.85;
      scale = Math.min(scaleX, scaleY); // 小さい方を採用して縦横比を保持

      // 中心位置の調整
      offsetX = canvas.width / 2 - ((bounds.maxX + bounds.minX) / 2) * scale;
      // 世界地図は画面中央よりやや上に配置
      offsetY = canvas.height / 2 - ((bounds.maxY + bounds.minY) / 2) * scale - canvas.height * 0.1;

      // 最小スケールは自動計算されたスケールの90%に設定（全体が見えるように）
      const calculatedMinScale = scale * 0.9;

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
        // 他の形状が必要な場合はここに追加
      }

      // 塗りつぶしと線
      ctx.fillStyle = 'rgba(230, 245, 255, 0.8)'; // 薄い水色
      ctx.strokeStyle = 'rgba(50, 120, 180, 0.9)'; // 暗めの青
      ctx.lineWidth = 0.8;
      ctx.fill();
      ctx.stroke();
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
      y: (90 - latitude) * scale + offsetY, // 緯度は90から引く（北半球の場合）
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
}
