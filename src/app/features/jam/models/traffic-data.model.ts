import { Feature } from '../../../models/geojson.model';
import { TrafficLevel } from './traffic-level.model';

/**
 * 時間帯を表す型（24時間形式の時間）
 */
export type HourOfDay =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

/**
 * 道路IDと交通混雑レベルのマッピングインターフェース
 */
export interface TrafficLevelMap {
  [roadId: string]: TrafficLevel;
}

/**
 * 時間帯ごとの交通混雑データを表すインターフェース
 */
export interface HourlyTrafficData {
  /** 時間（0-23） */
  hour: HourOfDay;

  /** 道路IDと交通混雑レベルのマッピング */
  trafficLevels: TrafficLevelMap;
}

/**
 * 1日の全時間帯の交通混雑データを表すインターフェース
 */
export interface DailyTrafficData {
  /** 日付（YYYY-MM-DD形式） */
  date: string;

  /** 時間ごとの交通混雑データ */
  hourlyData: HourlyTrafficData[];
}

/**
 * 道路特性と交通レベルを関連付けるインターフェース
 */
export interface RoadTrafficInfo {
  /** 道路のGeoJSON Feature */
  roadFeature: Feature;

  /** 交通混雑レベル（0-10） */
  trafficLevel: TrafficLevel;
}
