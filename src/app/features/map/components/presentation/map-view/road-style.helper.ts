/**
 * 交通混雑レベルに応じた道路スタイルのヘルパー関数
 */
import {
  TrafficLevel,
  getTrafficLevelLabel as getLabel,
  getTrafficLevelColor,
  getTrafficLevelWidth,
} from '../../../../../features/jam/models/traffic-level.model';

/**
 * 交通混雑レベルに応じたラベル文字列を取得する
 * @param level 交通混雑レベル（0-10）
 * @returns 対応するラベル文字列
 */
export function getTrafficLevelLabel(level: number): string {
  // number型をTrafficLevel型に変換（0-10の範囲に制限）
  const validLevel = Math.max(0, Math.min(10, level)) as TrafficLevel;
  return getLabel(validLevel);
}

/**
 * 交通混雑レベルに応じて道路のスタイル（色と線幅）を設定
 * @param ctx キャンバスコンテキスト
 * @param level 混雑レベル（0-10）
 */
export function setRoadStyleByTrafficLevel(ctx: CanvasRenderingContext2D, level: number): void {
  // 有効なレベル範囲に制限して、TrafficLevel型に変換
  const validLevel = Math.max(0, Math.min(10, level)) as TrafficLevel;

  // 色を設定
  ctx.strokeStyle = getTrafficLevelColor(validLevel);

  // 線幅を設定
  ctx.lineWidth = getTrafficLevelWidth(validLevel);
}
