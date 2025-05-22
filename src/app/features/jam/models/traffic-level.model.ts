/**
 * 交通混雑レベルを表す列挙型
 * 0: データなし、1-10: 混雑レベル（1=空いている、10=非常に混雑）
 */
export enum TrafficLevel {
  NO_DATA = 0,
  LEVEL_1 = 1,
  LEVEL_2 = 2,
  LEVEL_3 = 3,
  LEVEL_4 = 4,
  LEVEL_5 = 5,
  LEVEL_6 = 6,
  LEVEL_7 = 7,
  LEVEL_8 = 8,
  LEVEL_9 = 9,
  LEVEL_10 = 10,
}

/**
 * 交通混雑レベルに関連する定数
 */
export const TRAFFIC_LEVEL_CONSTANTS = {
  /** カラーマッピング：レベルに応じた色を返す配列（インデックス = TrafficLevel） */
  COLOR_MAP: [
    'rgba(128, 128, 128, 0.6)', // NO_DATA: グレー
    'rgba(0, 128, 0, 0.9)', // LEVEL_1: 緑（空いている）
    'rgba(0, 170, 0, 0.9)', // LEVEL_2
    'rgba(85, 170, 0, 0.9)', // LEVEL_3
    'rgba(170, 170, 0, 0.9)', // LEVEL_4
    'rgba(170, 128, 0, 0.9)', // LEVEL_5
    'rgba(255, 170, 0, 0.9)', // LEVEL_6
    'rgba(255, 85, 0, 0.9)', // LEVEL_7
    'rgba(255, 0, 0, 0.9)', // LEVEL_8
    'rgba(170, 0, 0, 0.9)', // LEVEL_9
    'rgba(128, 0, 0, 0.9)', // LEVEL_10: 暗い赤（非常に混雑）
  ],

  /** 線幅マッピング：レベルに応じた線幅を返す配列（インデックス = TrafficLevel） */
  WIDTH_MAP: [
    1.5, // NO_DATA: 細め
    2.0, // LEVEL_1
    2.0, // LEVEL_2
    2.0, // LEVEL_3
    2.5, // LEVEL_4
    2.5, // LEVEL_5
    3.0, // LEVEL_6
    3.0, // LEVEL_7
    3.5, // LEVEL_8
    3.5, // LEVEL_9
    4.0, // LEVEL_10: 太め
  ],

  /** ラベルマッピング：レベルに応じたラベルを返す配列（インデックス = TrafficLevel） */
  LABEL_MAP: [
    'データなし', // NO_DATA
    '空いている', // LEVEL_1
    'やや空いている', // LEVEL_2
    '比較的空いている', // LEVEL_3
    'やや混雑', // LEVEL_4
    '標準的な交通量', // LEVEL_5
    'やや混雑', // LEVEL_6
    '混雑', // LEVEL_7
    'かなり混雑', // LEVEL_8
    '非常に混雑', // LEVEL_9
    '深刻な渋滞', // LEVEL_10
  ],
} as const;

/**
 * 交通混雑レベルに基づいて色を取得する
 * @param level 交通混雑レベル（0-10）
 * @returns 対応する色（RGBA文字列）
 */
export function getTrafficLevelColor(level: TrafficLevel): string {
  if (level < 0 || level > 10) {
    return TRAFFIC_LEVEL_CONSTANTS.COLOR_MAP[TrafficLevel.NO_DATA];
  }
  return TRAFFIC_LEVEL_CONSTANTS.COLOR_MAP[level];
}

/**
 * 交通混雑レベルに基づいて線幅を取得する
 * @param level 交通混雑レベル（0-10）
 * @returns 対応する線幅
 */
export function getTrafficLevelWidth(level: TrafficLevel): number {
  if (level < 0 || level > 10) {
    return TRAFFIC_LEVEL_CONSTANTS.WIDTH_MAP[TrafficLevel.NO_DATA];
  }
  return TRAFFIC_LEVEL_CONSTANTS.WIDTH_MAP[level];
}

/**
 * 交通混雑レベルに基づいてラベルを取得する
 * @param level 交通混雑レベル（0-10）
 * @returns 対応するラベル文字列
 */
export function getTrafficLevelLabel(level: TrafficLevel): string {
  if (level < 0 || level > 10) {
    return TRAFFIC_LEVEL_CONSTANTS.LABEL_MAP[TrafficLevel.NO_DATA];
  }
  return TRAFFIC_LEVEL_CONSTANTS.LABEL_MAP[level];
}
