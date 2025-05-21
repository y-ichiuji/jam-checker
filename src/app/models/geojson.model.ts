// GeoJSON標準に基づいた型定義
// https://geojson.org/

export type Position = [number, number] | [number, number, number];

export interface Geometry {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coordinates: any;
}

export interface Point extends Geometry {
  type: 'Point';
  coordinates: Position;
}

export interface MultiPoint extends Geometry {
  type: 'MultiPoint';
  coordinates: Position[];
}

export interface LineString extends Geometry {
  type: 'LineString';
  coordinates: Position[];
}

export interface MultiLineString extends Geometry {
  type: 'MultiLineString';
  coordinates: Position[][];
}

export interface Polygon extends Geometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface MultiPolygon extends Geometry {
  type: 'MultiPolygon';
  coordinates: Position[][][];
}

export interface GeometryCollection {
  type: 'GeometryCollection';
  geometries: Geometry[];
}

export interface Feature {
  type: 'Feature';
  geometry: Geometry | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties: { [key: string]: any } | null;
  id?: string | number;
}

export interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}
