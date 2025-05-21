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

import { ErrorPresentationComponent } from '../../../components/common/presentation/error-presentation.component';
import { LoadingPresentationComponent } from '../../../components/common/presentation/loading-presentation.component';
import { FeatureCollection, Position } from '../../../models/geojson.model';

@Component({
  selector: 'app-map-presentation',
  standalone: true,
  imports: [LoadingPresentationComponent, ErrorPresentationComponent],
  templateUrl: './map-presentation.component.html',
  styles: ``,
})
export class MapPresentationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapCanvas') mapCanvasRef!: ElementRef<HTMLCanvasElement>;

  // 入力シグナル - 地図データを受け取る
  readonly mapData = input<FeatureCollection | null>(null);

  // 入力シグナル - 読み込み中状態
  readonly loading = input<boolean>(false);

  // 入力シグナル - エラー状態
  readonly error = input<string | null>(null);

  // 出力シグナル - クリックイベントを発信
  readonly mapClick = output<{ x: number; y: number }>();

  // 出力シグナル - 再試行イベントを発信
  readonly retryLoad = output<void>();

  private context: CanvasRenderingContext2D | null = null;
  private boundMapDataChanged: () => void;

  constructor() {
    // thisをバインド
    this.boundMapDataChanged = this.drawMap.bind(this);

    // 地図データの変更を監視
    effect(() => {
      const data = this.mapData();
      if (data && this.context) {
        this.drawMap();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
  }

  ngOnDestroy(): void {
    // リサイズイベントのリスナーを削除
    window.removeEventListener('resize', this.resizeCanvas.bind(this));
  }

  private initializeCanvas(): void {
    const canvas = this.mapCanvasRef.nativeElement;
    this.context = canvas.getContext('2d');

    // キャンバスのサイズを設定
    this.resizeCanvas();

    // リサイズイベントのリスナー設定
    window.addEventListener('resize', this.resizeCanvas.bind(this));
  }

  private resizeCanvas(): void {
    if (!this.context) return;

    const canvas = this.mapCanvasRef.nativeElement;
    const parent = canvas.parentElement;

    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
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

    // GeoJSONの描画
    this.drawGeoJSON(data, ctx, canvas);
  }

  /**
   * GeoJSONデータをキャンバスに描画する
   */
  private drawGeoJSON(
    geojson: FeatureCollection,
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    // 地図の境界を計算
    const bounds = this.calculateBounds(geojson);
    if (!bounds) return;

    // 縮尺の計算（キャンバスに合わせる）
    // 日本の国土は南北に長いので、縦方向のスケールを少し調整
    const scaleX = (canvas.width / (bounds.maxX - bounds.minX)) * 0.95;
    const scaleY = (canvas.height / (bounds.maxY - bounds.minY)) * 0.85;
    const scale = Math.min(scaleX, scaleY); // 小さい方を採用して縦横比を保持

    // 中心位置の調整
    const offsetX = canvas.width / 2 - ((bounds.maxX + bounds.minX) / 2) * scale;
    // 日本地図は画面中央よりやや上に配置
    const offsetY =
      canvas.height / 2 - ((bounds.maxY + bounds.minY) / 2) * scale - canvas.height * 0.1;

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
