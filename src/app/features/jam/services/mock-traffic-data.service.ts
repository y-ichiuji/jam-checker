import { Injectable } from '@angular/core';

import { Feature, FeatureCollection } from '../../../models/geojson.model';
import {
  DailyTrafficData,
  HourOfDay,
  HourlyTrafficData,
  TrafficLevelMap,
} from '../models/traffic-data.model';
import { TrafficLevel } from '../models/traffic-level.model';

/**
 * 交通データサービスのモック版
 * 静的なモックデータを提供します。
 * 将来的には実際のAPIと連携される予定です。
 */
@Injectable({
  providedIn: 'root',
})
export class MockTrafficDataService {
  /**
   * 指定された日付と時間の交通混雑データを生成します
   * @param date 日付（文字列 YYYY-MM-DD形式）
   * @returns DailyTrafficDataオブジェクト
   */
  generateDailyTrafficData(date: string): DailyTrafficData {
    const hourlyData: HourlyTrafficData[] = [];

    // 0-23時までの各時間帯のデータを生成
    for (let hour = 0; hour < 24; hour++) {
      hourlyData.push({
        hour: hour as HourOfDay,
        trafficLevels: {},
      });
    }

    return {
      date,
      hourlyData,
    };
  }

  /**
   * 道路データに基づいて交通混雑レベルを生成します
   * @param roadData 道路のGeoJSONデータ
   * @param date 日付（文字列 YYYY-MM-DD形式）
   * @returns DailyTrafficDataオブジェクト
   */
  generateTrafficLevelsForRoads(roadData: FeatureCollection, date: string): DailyTrafficData {
    const dailyData = this.generateDailyTrafficData(date);

    if (!roadData?.features?.length) {
      return dailyData;
    }

    // 道路のIDを取得
    const roadIds = roadData.features
      .map(feature => feature.properties?.['N12_005'] || feature.id)
      .filter(id => id !== undefined) as number[];

    // 各時間帯の交通レベルを生成
    dailyData.hourlyData.forEach(hourData => {
      const trafficLevels: TrafficLevelMap = {};

      roadIds.forEach(roadId => {
        // 時間帯によって異なる交通混雑パターンを生成
        let baseLevel: TrafficLevel;
        const hour = hourData.hour;

        // 朝のラッシュ（6-9時）
        if (hour >= 6 && hour <= 9) {
          baseLevel = TrafficLevel.LEVEL_8;
        }
        // 夕方のラッシュ（17-20時）
        else if (hour >= 17 && hour <= 20) {
          baseLevel = TrafficLevel.LEVEL_9;
        }
        // 昼間（10-16時）
        else if (hour >= 10 && hour <= 16) {
          baseLevel = TrafficLevel.LEVEL_5;
        }
        // 夜間（21-23時）
        else if (hour >= 21 && hour <= 23) {
          baseLevel = TrafficLevel.LEVEL_3;
        }
        // 深夜（0-5時）
        else {
          baseLevel = TrafficLevel.LEVEL_1;
        }

        // 道路IDの数値部分を使って一部のランダム変動を加える（道路ごとに少し異なるレベルに）
        const variation = (roadId % 3) - 1; // -1, 0, +1のいずれか

        // 最終的な交通レベルを計算（範囲内に収める）
        const finalLevel = Math.max(1, Math.min(10, baseLevel + variation)) as TrafficLevel;
        trafficLevels[roadId] = finalLevel;
      });

      hourData.trafficLevels = trafficLevels;
    });

    return dailyData;
  }

  /**
   * 道路特性と時間に基づいて交通レベルを取得します
   * @param feature 道路の地理的特性
   * @param dailyTrafficData 日ごとの交通データ
   * @param hour 時間（0-23）
   * @returns 交通レベル（0-10）
   */
  getTrafficLevelForRoad(
    feature: Feature,
    dailyTrafficData: DailyTrafficData | null,
    hour: HourOfDay
  ): TrafficLevel {
    if (!dailyTrafficData) {
      return TrafficLevel.NO_DATA;
    }

    // 指定時間のデータを取得
    const hourData = dailyTrafficData.hourlyData.find(data => data.hour === hour);
    if (!hourData) {
      return TrafficLevel.NO_DATA;
    }

    // 道路IDを取得
    const roadId = feature.properties?.['N12_005'] || feature.id;
    if (!roadId) {
      return TrafficLevel.NO_DATA;
    }

    // 交通レベルを取得
    return hourData.trafficLevels[roadId as string] || TrafficLevel.NO_DATA;
  }
}
