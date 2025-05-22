/**
 * 交通混雑レベルに応じた道路スタイルのヘルパー関数
 */

/**
 * 交通混雑レベルのラベル定義
 */
const TRAFFIC_LEVEL_LABELS = [
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
] as const;

/**
 * 交通混雑レベルに応じて道路のスタイル（色と線幅）を設定
 * @param ctx キャンバスコンテキスト
 * @param level 混雑レベル（0-10）
 */
export function setRoadStyleByTrafficLevel(ctx: CanvasRenderingContext2D, level: number): void {
  // 交通混雑レベルに応じた色のマッピング
  // 0: グレー（データなし）、1-10: 緑（空いている）から赤（混雑している）まで
  const colors = [
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
  ] as const;

  // 混雑レベルに応じた線幅のマッピング
  const widths = [
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
  ] as const;

  // 有効なレベル範囲に制限
  const validLevel = Math.max(0, Math.min(10, level));

  // デフォルト値（型安全のため）
  const defaultColor = 'rgba(128, 128, 128, 0.6)';
  const defaultWidth = 1.5;

  // 色を設定
  if (validLevel < colors.length && colors[validLevel]) {
    ctx.strokeStyle = colors[validLevel];
  } else {
    ctx.strokeStyle = defaultColor;
  }

  // 線幅を設定
  if (validLevel < widths.length && widths[validLevel]) {
    ctx.lineWidth = widths[validLevel];
  } else {
    ctx.lineWidth = defaultWidth;
  }
}

/**
 * 交通混雑レベルに応じたラベル文字列を取得する
 * @param level 交通混雑レベル（0-10）
 * @returns 対応するラベル文字列
 */
export function getTrafficLevelLabel(level: number): string {
  const validLevel = Math.max(0, Math.min(10, level));
  return validLevel < TRAFFIC_LEVEL_LABELS.length
    ? TRAFFIC_LEVEL_LABELS[validLevel]!
    : TRAFFIC_LEVEL_LABELS[0];
}
