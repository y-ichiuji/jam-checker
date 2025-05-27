import { Injectable } from '@angular/core';
import { Feature, FeatureCollection } from '../../../models/geojson.model';
import { MapTile, MapTileConfig, TileBounds } from '../models/map-tile.model';

/**
 * タイル管理サービスの定数
 */
const TILE_MANAGER_CONSTANTS = {
  /** タイルグリッドの分割数（縦横それぞれ4分割） */
  GRID_SIZE: 8,
  /** 日本の緯度範囲（北端：北海道） */
  JAPAN_MAX_LATITUDE: 45.5,
  /** 日本の緯度範囲（南端：沖縄） */
  JAPAN_MIN_LATITUDE: 24.0,
  /** 日本の経度範囲（西端：沖縄） */
  JAPAN_MIN_LONGITUDE: 122.9,
  /** 日本の経度範囲（東端：北海道） */
  JAPAN_MAX_LONGITUDE: 153.9,
};

@Injectable({
  providedIn: 'root',
})
export class TileManagerService {
  /** 現在保持しているタイル */
  private tiles = new Map<string, MapTile>();
  /** 道路タイル */
  private roadTiles = new Map<string, MapTile>();

  /**
   * 地図タイルが初期化されているかチェック
   */
  hasTiles(): boolean {
    return this.tiles.size > 0;
  }

  /**
   * 道路タイルが初期化されているかチェック
   */
  hasRoadTiles(): boolean {
    return this.roadTiles.size > 0;
  }

  /**
   * 道路データをタイルに分割して初期化
   */
  initializeRoadTiles(featureCollection: FeatureCollection): void {
    this.roadTiles.clear();

    // 日本の地理的範囲
    const bounds = {
      minLon: TILE_MANAGER_CONSTANTS.JAPAN_MIN_LONGITUDE,
      maxLon: TILE_MANAGER_CONSTANTS.JAPAN_MAX_LONGITUDE,
      minLat: TILE_MANAGER_CONSTANTS.JAPAN_MIN_LATITUDE,
      maxLat: TILE_MANAGER_CONSTANTS.JAPAN_MAX_LATITUDE,
    };

    const gridSize = TILE_MANAGER_CONSTANTS.GRID_SIZE;
    const lonRange = bounds.maxLon - bounds.minLon;
    const latRange = bounds.maxLat - bounds.minLat;
    const tileLonSize = lonRange / gridSize;
    const tileLatSize = latRange / gridSize;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const tileBounds = {
          minLon: bounds.minLon + i * tileLonSize,
          maxLon: bounds.minLon + (i + 1) * tileLonSize,
          minLat: bounds.minLat + j * tileLatSize,
          maxLat: bounds.minLat + (j + 1) * tileLatSize,
        };

        const tileFeatures = this.getFeaturesInBounds(featureCollection.features, tileBounds);
        if (tileFeatures.length > 0) {
          const tileConfig: MapTileConfig = {
            id: `road_tile_${i}_${j}`,
            bounds: tileBounds,
            features: tileFeatures,
          };
          this.roadTiles.set(tileConfig.id, new MapTile(tileConfig));
        }
      }
    }
  }

  /**
   * 指定されたビューポート内の道路タイルを取得
   */
  getRoadTilesInViewport(viewport: TileBounds): MapTile[] {
    const visibleTiles: MapTile[] = [];
    this.roadTiles.forEach(tile => {
      if (tile.intersectsViewport(viewport)) {
        visibleTiles.push(tile);
      }
    });
    return visibleTiles;
  }

  /**
   * 地図データをタイルに分割
   */
  initializeTiles(featureCollection: FeatureCollection): void {
    // 既存のタイルをクリア
    this.tiles.clear();

    // 日本の地理的範囲
    const bounds = {
      minLon: TILE_MANAGER_CONSTANTS.JAPAN_MIN_LONGITUDE,
      maxLon: TILE_MANAGER_CONSTANTS.JAPAN_MAX_LONGITUDE,
      minLat: TILE_MANAGER_CONSTANTS.JAPAN_MIN_LATITUDE,
      maxLat: TILE_MANAGER_CONSTANTS.JAPAN_MAX_LATITUDE,
    };

    const gridSize = TILE_MANAGER_CONSTANTS.GRID_SIZE;
    const lonRange = bounds.maxLon - bounds.minLon;
    const latRange = bounds.maxLat - bounds.minLat;
    const tileLonSize = lonRange / gridSize;
    const tileLatSize = latRange / gridSize;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const tileBounds = {
          minLon: bounds.minLon + i * tileLonSize,
          maxLon: bounds.minLon + (i + 1) * tileLonSize,
          minLat: bounds.minLat + j * tileLatSize,
          maxLat: bounds.minLat + (j + 1) * tileLatSize,
        };

        const tileFeatures = this.getFeaturesInBounds(featureCollection.features, tileBounds);
        if (tileFeatures.length > 0) {
          const tileConfig: MapTileConfig = {
            id: `tile_${i}_${j}`,
            bounds: tileBounds,
            features: tileFeatures,
          };
          this.tiles.set(tileConfig.id, new MapTile(tileConfig));
        }
      }
    }
  }

  /**
   * 指定した境界内のフィーチャーを取得
   */
  private getFeaturesInBounds(features: Feature[], bounds: TileBounds): Feature[] {
    return features.filter(feature => {
      const featureBounds = this.calculateFeatureBounds(feature);
      return featureBounds ? this.boundsIntersect(bounds, featureBounds) : false;
    });
  }

  /**
   * フィーチャーの境界を計算
   */
  private calculateFeatureBounds(feature: Feature): TileBounds | null {
    if (!feature.geometry || !feature.geometry.coordinates) return null;

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    const processPoint = (coordinates: [number, number]): void => {
      const [lon, lat] = coordinates;
      if (typeof lon === 'number' && typeof lat === 'number') {
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    };

    const processLineString = (coordinates: [number, number][]): void => {
      coordinates.forEach(processPoint);
    };

    const processPolygon = (coordinates: [number, number][][]): void => {
      coordinates.forEach(ring => ring.forEach(processPoint));
    };

    switch (feature.geometry.type) {
      case 'Point':
        if (Array.isArray(feature.geometry.coordinates)) {
          processPoint(feature.geometry.coordinates as [number, number]);
        }
        break;
      case 'LineString':
        if (Array.isArray(feature.geometry.coordinates)) {
          processLineString(feature.geometry.coordinates as [number, number][]);
        }
        break;
      case 'Polygon':
        if (Array.isArray(feature.geometry.coordinates)) {
          processPolygon(feature.geometry.coordinates as [number, number][][]);
        }
        break;
      case 'MultiLineString':
        if (Array.isArray(feature.geometry.coordinates)) {
          feature.geometry.coordinates.forEach(line => {
            if (Array.isArray(line)) {
              processLineString(line as [number, number][]);
            }
          });
        }
        break;
      case 'MultiPolygon':
        if (Array.isArray(feature.geometry.coordinates)) {
          feature.geometry.coordinates.forEach(polygon => {
            if (Array.isArray(polygon)) {
              processPolygon(polygon as [number, number][][]);
            }
          });
        }
        break;
      default:
        return null;
    }

    return {
      minLon,
      maxLon,
      minLat,
      maxLat,
    };
  }

  /**
   * 二つの境界が交差するかどうか判定
   */
  private boundsIntersect(bounds1: TileBounds, bounds2: TileBounds): boolean {
    return !(
      bounds1.maxLon < bounds2.minLon ||
      bounds1.minLon > bounds2.maxLon ||
      bounds1.maxLat < bounds2.minLat ||
      bounds1.minLat > bounds2.maxLat
    );
  }

  /**
   * 現在のビューポートに含まれるタイルを取得
   */
  getTilesInViewport(viewport: TileBounds): MapTile[] {
    const visibleTiles: MapTile[] = [];
    this.tiles.forEach(tile => {
      if (tile.intersectsViewport(viewport)) {
        visibleTiles.push(tile);
      }
    });
    return visibleTiles;
  }

  /**
   * すべてのタイルをリセット
   */
  resetTiles(): void {
    this.tiles.forEach(tile => tile.reset());
    this.roadTiles.forEach(tile => tile.reset());
  }
}
