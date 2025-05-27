import { Injectable } from '@angular/core';
import { Feature } from '../../../models/geojson.model';
import { setRoadStyleByTrafficLevel } from '../components/presentation/map-view/road-style.helper';
import { MapTile } from '../models/map-tile.model';
import { MapTransform } from '../models/map-transform.model';

/**
 * タイルレンダラーの定数
 */
const TILE_RENDERER_CONSTANTS = {
  /** デフォルトの線の色 */
  DEFAULT_STROKE_COLOR: '#666666',
  /** デフォルトの線の幅 */
  DEFAULT_LINE_WIDTH: 1,
  /** デフォルトの塗りつぶし色 */
  DEFAULT_FILL_COLOR: '#f0f0f0',
};

@Injectable({
  providedIn: 'root',
})
export class TileRendererService {
  /**
   * タイルを描画
   */
  renderTile(
    ctx: CanvasRenderingContext2D,
    tile: MapTile,
    transform: MapTransform,
    trafficMap?: Map<string, number>
  ): void {
    // タイルの各フィーチャーを描画
    tile.features.forEach(feature => {
      this.renderFeature(ctx, feature, transform, trafficMap);
    });

    // タイルをレンダリング済みとしてマーク
    tile.markAsRendered();
  }

  /**
   * フィーチャーを描画
   */
  private renderFeature(
    ctx: CanvasRenderingContext2D,
    feature: Feature,
    transform: MapTransform,
    trafficMap?: Map<string, number>
  ): void {
    if (!feature.geometry || !feature.geometry.coordinates) return;

    ctx.beginPath();

    // デフォルトのスタイルを設定
    ctx.strokeStyle = TILE_RENDERER_CONSTANTS.DEFAULT_STROKE_COLOR;
    ctx.lineWidth = TILE_RENDERER_CONSTANTS.DEFAULT_LINE_WIDTH;
    ctx.fillStyle = TILE_RENDERER_CONSTANTS.DEFAULT_FILL_COLOR;

    // ジオメトリタイプに応じて描画
    switch (feature.geometry.type) {
      case 'Point':
        this.drawPoint(ctx, feature.geometry.coordinates as [number, number], transform);
        break;
      case 'LineString':
        this.drawLineString(ctx, feature.geometry.coordinates as [number, number][], transform);
        break;
      case 'Polygon':
        this.drawPolygon(ctx, feature.geometry.coordinates as [number, number][][], transform);
        break;
      case 'MultiLineString':
        this.drawMultiLineString(
          ctx,
          feature.geometry.coordinates as [number, number][][],
          transform
        );
        break;
      case 'MultiPolygon':
        this.drawMultiPolygon(
          ctx,
          feature.geometry.coordinates as [number, number][][][],
          transform
        );
        break;
    }

    // 道路IDから交通混雑レベルを確認し、スタイルを適用（道路データの場合）
    if (
      trafficMap &&
      (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')
    ) {
      // 道路IDを取得
      const roadId = feature.properties?.['N12_005'] || feature.id;
      if (roadId && trafficMap.has(roadId.toString())) {
        // 交通レベルに応じたスタイルを設定
        const level = trafficMap.get(roadId.toString()) || 0;
        setRoadStyleByTrafficLevel(ctx, level);
      }
    }

    // ジオメトリタイプに応じて適切な描画メソッドを実行
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      ctx.fill();
      ctx.stroke();
    } else if (
      feature.geometry.type === 'LineString' ||
      feature.geometry.type === 'MultiLineString'
    ) {
      ctx.stroke();
    }
  }

  /**
   * 点を描画
   */
  private drawPoint(
    ctx: CanvasRenderingContext2D,
    coordinates: [number, number],
    transform: MapTransform
  ): void {
    const point = this.projectPoint(coordinates, transform);
    ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
  }

  /**
   * LineStringを描画
   */
  private drawLineString(
    ctx: CanvasRenderingContext2D,
    coordinates: [number, number][],
    transform: MapTransform
  ): void {
    if (coordinates.length === 0) return;

    // TypeScriptの型チェックを満たすため、最初の座標の存在を確認
    const firstCoord = coordinates[0];
    if (!firstCoord) return;

    const start = this.projectPoint(firstCoord, transform);
    ctx.moveTo(start.x, start.y);

    for (let i = 1; i < coordinates.length; i++) {
      const coord = coordinates[i];
      if (coord) {
        const point = this.projectPoint(coord, transform);
        ctx.lineTo(point.x, point.y);
      }
    }
  }

  /**
   * MultiLineStringを描画
   */
  private drawMultiLineString(
    ctx: CanvasRenderingContext2D,
    coordinates: [number, number][][],
    transform: MapTransform
  ): void {
    coordinates.forEach(line => {
      this.drawLineString(ctx, line, transform);
    });
  }

  /**
   * Polygonを描画
   */
  private drawPolygon(
    ctx: CanvasRenderingContext2D,
    coordinates: [number, number][][],
    transform: MapTransform
  ): void {
    coordinates.forEach((ring, index) => {
      this.drawLineString(ctx, ring, transform);
      if (index === 0) {
        ctx.closePath();
      }
    });
  }

  /**
   * MultiPolygonを描画
   */
  private drawMultiPolygon(
    ctx: CanvasRenderingContext2D,
    coordinates: [number, number][][][],
    transform: MapTransform
  ): void {
    coordinates.forEach(polygon => {
      this.drawPolygon(ctx, polygon, transform);
    });
  }

  /**
   * 座標点をキャンバス座標に変換
   */
  private projectPoint(
    position: [number, number],
    transform: MapTransform
  ): { x: number; y: number } {
    const [longitude, latitude] = position;
    return {
      x: longitude * transform.scale + transform.offsetX,
      y: (90 - latitude) * transform.scale + transform.offsetY,
    };
  }
}
