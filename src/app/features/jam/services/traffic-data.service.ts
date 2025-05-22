import { Injectable, inject } from '@angular/core';

import { Feature, FeatureCollection } from '../../../models/geojson.model';
import { DailyTrafficData, HourOfDay, RoadTrafficInfo } from '../models/traffic-data.model';
import { TrafficLevel } from '../models/traffic-level.model';
import { MockTrafficDataService } from './mock-traffic-data.service';

/**
 * 交通データに関連する機能を提供するサービス
 * 現在はモックデータを使用していますが、将来的には実際のAPIと連携します
 */
@Injectable({
  providedIn: 'root',
})
export class TrafficDataService {
  private mockTrafficDataService = inject(MockTrafficDataService);

  /**
   * 現在の日付を取得します（YYYY-MM-DD形式）
   * @returns 日付文字列
   */
  private getCurrentDate(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 現在の時刻を取得します（時のみ、0-23）
   * @returns 時間（0-23）
   */
  private getCurrentHour(): HourOfDay {
    return new Date().getHours() as HourOfDay;
  }

  /**
   * 指定された日付と道路データに基づいて交通混雑データを取得します
   * 現在はモックデータを生成していますが、将来的にはAPIから取得します
   * @param roadData 道路のGeoJSONデータ
   * @param date 日付（YYYY-MM-DD形式、省略時は現在の日付）
   * @returns DailyTrafficDataオブジェクトのPromise
   */
  async fetchTrafficData(
    roadData: FeatureCollection,
    date: string = this.getCurrentDate()
  ): Promise<DailyTrafficData> {
    // モックデータを生成（将来的にはAPIから取得）
    return this.mockTrafficDataService.generateTrafficLevelsForRoads(roadData, date);
  }

  /**
   * 指定された時間の交通混雑レベルを持つ道路データを取得します
   * @param roadData 道路のGeoJSONデータ
   * @param trafficData 交通混雑データ
   * @param hour 時間（0-23、省略時は現在の時間）
   * @returns 道路と交通レベルの関連情報配列
   */
  getRoadTrafficInfoForHour(
    roadData: FeatureCollection | null,
    trafficData: DailyTrafficData | null,
    hour: HourOfDay = this.getCurrentHour()
  ): RoadTrafficInfo[] {
    if (!roadData?.features?.length || !trafficData) {
      return [];
    }

    return roadData.features.map(feature => {
      const trafficLevel = this.mockTrafficDataService.getTrafficLevelForRoad(
        feature,
        trafficData,
        hour
      );

      return {
        roadFeature: feature,
        trafficLevel,
      };
    });
  }

  /**
   * 指定された道路の特定時間の交通混雑レベルを取得します
   * @param feature 道路の地理的特性
   * @param trafficData 交通混雑データ
   * @param hour 時間（0-23、省略時は現在の時間）
   * @returns 交通混雑レベル（0-10）
   */
  getTrafficLevelForRoad(
    feature: Feature,
    trafficData: DailyTrafficData | null,
    hour: HourOfDay = this.getCurrentHour()
  ): TrafficLevel {
    return this.mockTrafficDataService.getTrafficLevelForRoad(feature, trafficData, hour);
  }
}
