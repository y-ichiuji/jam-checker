import { Feature } from '../../../models/geojson.model';

/**
 * タイルの地理的境界を表すインターフェース
 */
export interface TileBounds {
  /** 最小経度 */
  minLon: number;
  /** 最大経度 */
  maxLon: number;
  /** 最小緯度 */
  minLat: number;
  /** 最大緯度 */
  maxLat: number;
}

/**
 * タイルの設定を表すインターフェース
 */
export interface MapTileConfig {
  /** タイルの識別ID */
  id: string;
  /** タイルの地理的境界 */
  bounds: TileBounds;
  /** タイルが含む地図データ */
  features: Feature[];
}

/**
 * タイル内のフィーチャー（道路など）の描画状態を管理するクラス
 */
export class MapTile {
  readonly id: string;
  readonly bounds: TileBounds;
  readonly features: Feature[];
  private rendered = false;

  constructor(config: MapTileConfig) {
    this.id = config.id;
    this.bounds = config.bounds;
    this.features = config.features;
  }

  /**
   * タイルとビューポートの交差判定
   */
  intersectsViewport(viewport: TileBounds): boolean {
    return !(
      this.bounds.maxLon < viewport.minLon ||
      this.bounds.minLon > viewport.maxLon ||
      this.bounds.maxLat < viewport.minLat ||
      this.bounds.minLat > viewport.maxLat
    );
  }

  /**
   * タイルのレンダリング状態をリセット
   */
  reset(): void {
    this.rendered = false;
  }

  /**
   * タイルが既にレンダリングされているかチェック
   */
  isRendered(): boolean {
    return this.rendered;
  }

  /**
   * タイルをレンダリング済みとしてマーク
   */
  markAsRendered(): void {
    this.rendered = true;
  }
}
