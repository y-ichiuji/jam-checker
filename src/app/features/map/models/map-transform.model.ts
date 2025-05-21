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
 * 地図変換の初期値を生成する関数
 */
export function createInitialTransform(): MapTransform {
  return {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale: 0.5,
    maxScale: 5,
  };
}
