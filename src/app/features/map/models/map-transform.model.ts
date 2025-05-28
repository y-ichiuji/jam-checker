/**
 * 地図の変換情報を管理するインターフェース
 * スケール、オフセット、ズーム制限などの情報を保持
 */
export interface MapTransform {
  /** 現在の拡大率 */
  scale: number;

  /** X軸オフセット (ピクセル単位) */
  offsetX: number;

  /** Y軸オフセット (ピクセル単位) */
  offsetY: number;

  /** 最小拡大率 */
  minScale: number;

  /** 最大拡大率 */
  maxScale: number;

  /** X軸方向の最大オフセット（+ 右方向, - 左方向）*/
  maxOffsetX: number;

  /** Y軸方向の最大オフセット（+ 下方向, - 上方向）*/
  maxOffsetY: number;
}

/**
 * パン（移動）操作イベントのインターフェース
 */
export interface PanEvent {
  /** X軸方向の移動量（ピクセル単位） */
  deltaX: number;

  /** Y軸方向の移動量（ピクセル単位） */
  deltaY: number;
}

/**
 * ズーム操作イベントのインターフェース
 */
export interface ZoomEvent {
  /** ズーム倍率の変化量 */
  deltaScale: number;

  /** ズームの中心となるX座標（ピクセル単位） */
  centerX: number;

  /** ズームの中心となるY座標（ピクセル単位） */
  centerY: number;
}

/**
 * 地図の境界情報のインターフェース
 */
export interface MapBounds {
  /** 最小X座標 (経度) */
  minX: number;

  /** 最小Y座標 (緯度) */
  minY: number;

  /** 最大X座標 (経度) */
  maxX: number;

  /** 最大Y座標 (緯度) */
  maxY: number;
}

/**
 * 座標位置の表現
 */
export interface Point {
  /** X座標 */
  x: number;

  /** Y座標 */
  y: number;
}

/**
 * 地図変換の定数
 */
export const MAP_TRANSFORM_CONSTANTS = {
  /** 初期スケール値 */
  INITIAL_SCALE: 20,
  /** 初期X軸オフセット */
  INITIAL_OFFSET_X: 500,
  /** 初期Y軸オフセット */
  INITIAL_OFFSET_Y: 30,
  /** 最小拡大率 */
  MIN_SCALE: 1.0,
  /** 最大拡大率 */
  MAX_SCALE: 20000,
  /** X軸方向の最大オフセット初期値 */
  INITIAL_MAX_OFFSET_X: 10000,
  /** Y軸方向の最大オフセット初期値 */
  INITIAL_MAX_OFFSET_Y: 10000,
};

/**
 * 地図変換の初期値を生成する関数
 */
export function createInitialTransform(): MapTransform {
  return {
    scale: MAP_TRANSFORM_CONSTANTS.INITIAL_SCALE,
    offsetX: MAP_TRANSFORM_CONSTANTS.INITIAL_OFFSET_X,
    offsetY: MAP_TRANSFORM_CONSTANTS.INITIAL_OFFSET_Y,
    minScale: MAP_TRANSFORM_CONSTANTS.MIN_SCALE,
    maxScale: MAP_TRANSFORM_CONSTANTS.MAX_SCALE,
    maxOffsetX: MAP_TRANSFORM_CONSTANTS.INITIAL_MAX_OFFSET_X,
    maxOffsetY: MAP_TRANSFORM_CONSTANTS.INITIAL_MAX_OFFSET_Y,
  };
}
