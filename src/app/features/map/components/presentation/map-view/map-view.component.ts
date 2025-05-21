import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';

import { LoadingViewComponent } from '../../../../../components/ui/loading-view/loading-view.component';
import { FeatureCollection, Position } from '../../../../../models/geojson.model';
import {
  MapBounds,
  MapTransform,
  PanEvent,
  Point,
  ZoomEvent,
  createInitialTransform,
} from '../../../models/map-transform.model';
import { MapErrorViewComponent } from '../map-error-view/map-error-view.component';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [LoadingViewComponent, MapErrorViewComponent],
  templateUrl: './map-view.component.html',
  styles: ``,
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

  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // ドラッグ操作用の変数
  private isDragging = false;
  private lastMousePosition: Point | null = null;

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

    // イベントリスナーの削除
    this.removeEventListeners();
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
   * マウスホイールイベントのハンドラ
   */
  @HostListener('wheel', ['$event'])
  private handleWheel(event: WheelEvent): void {
    event.preventDefault();

    if (!this.mapCanvasRef) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // マウス位置をキャンバス座標系に変換
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // ズーム量の計算（正: 拡大、負: 縮小）
    const zoomDirection = event.deltaY < 0 ? 1 : -1;
    const zoomFactor = 1 + zoomDirection * 0.1; // 10%ずつ拡大/縮小

    this.zoomEvent.emit({
      deltaScale: zoomFactor,
      centerX: mouseX,
      centerY: mouseY,
    });
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    const canvas = this.mapCanvasRef?.nativeElement;
    if (!canvas) return;

    // マウスダウンイベント
    canvas.addEventListener('mousedown', this.handleMouseDown);

    // タッチイベント（モバイル対応）
    canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd);

    // クリックイベント
    canvas.addEventListener('click', this.handleClick);
  }

  /**
   * イベントリスナーの削除
   */
  private removeEventListeners(): void {
    const canvas = this.mapCanvasRef?.nativeElement;
    if (!canvas) return;

    canvas.removeEventListener('mousedown', this.handleMouseDown);
    canvas.removeEventListener('touchstart', this.handleTouchStart);
    canvas.removeEventListener('touchmove', this.handleTouchMove);
    canvas.removeEventListener('touchend', this.handleTouchEnd);
    canvas.removeEventListener('click', this.handleClick);

    // グローバルイベントリスナーの削除
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  /**
   * マウスダウンイベントハンドラ
   */
  private handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault();
    this.isDragging = true;

    const canvas = this.mapCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    this.lastMousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // グローバルイベントを追加
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  };

  /**
   * マウス移動イベントハンドラ
   */
  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging || !this.lastMousePosition) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const currentPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const deltaX = currentPosition.x - this.lastMousePosition.x;
    const deltaY = currentPosition.y - this.lastMousePosition.y;

    // パンイベントを発行
    this.panEvent.emit({ deltaX, deltaY });

    // 最後のマウス位置を更新
    this.lastMousePosition = currentPosition;
  };

  /**
   * マウスアップイベントハンドラ
   */
  private handleMouseUp = (): void => {
    this.isDragging = false;
    this.lastMousePosition = null;

    // グローバルイベントを削除
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
  };

  /**
   * タッチ開始イベントハンドラ
   */
  private handleTouchStart = (event: TouchEvent): void => {
    if (event.touches.length !== 1) return;

    event.preventDefault();
    this.isDragging = true;

    const touch = event.touches[0];
    if (!touch) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    this.lastMousePosition = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  /**
   * タッチ移動イベントハンドラ
   */
  private handleTouchMove = (event: TouchEvent): void => {
    if (!this.isDragging || !this.lastMousePosition || event.touches.length !== 1) return;

    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const currentPosition = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };

    const deltaX = currentPosition.x - this.lastMousePosition.x;
    const deltaY = currentPosition.y - this.lastMousePosition.y;

    // パンイベントを発行
    this.panEvent.emit({ deltaX, deltaY });

    // 最後のタッチ位置を更新
    this.lastMousePosition = currentPosition;
  };

  /**
   * タッチ終了イベントハンドラ
   */
  private handleTouchEnd = (): void => {
    this.isDragging = false;
    this.lastMousePosition = null;
  };

  /**
   * クリックイベントハンドラ
   */
  private handleClick = (event: MouseEvent): void => {
    // ドラッグ操作の直後のクリックは無視
    if (this.isDragging) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.mapClick.emit({ x, y });
  };

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
      // 縮尺の計算（キャンバスに合わせる）
      const scaleX = (canvas.width / (bounds.maxX - bounds.minX)) * 0.95;
      const scaleY = (canvas.height / (bounds.maxY - bounds.minY)) * 0.85;
      scale = Math.min(scaleX, scaleY); // 小さい方を採用して縦横比を保持

      // 中心位置の調整
      offsetX = canvas.width / 2 - ((bounds.maxX + bounds.minX) / 2) * scale;
      // 日本地図は画面中央よりやや上に配置
      offsetY = canvas.height / 2 - ((bounds.maxY + bounds.minY) / 2) * scale - canvas.height * 0.1;
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
