import { TrafficLevel } from '../../../features/jam/models/traffic-level.model';

/**
 * 道路クリック時の吹き出し情報を表すインターフェース
 */
export interface RoadPopup {
  /** 吹き出しのX座標（画面上の位置） */
  x: number;

  /** 吹き出しのY座標（画面上の位置） */
  y: number;

  /** 表示する道路名 */
  roadName: string;

  /** 道路の特性情報（オプション） */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  properties?: Record<string, any>;

  /** 交通混雑レベル（オプション） */
  trafficLevel?: TrafficLevel;
}
