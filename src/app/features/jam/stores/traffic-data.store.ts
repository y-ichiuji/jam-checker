import { Injectable, computed, inject, signal } from '@angular/core';

import { FeatureCollection } from '../../../models/geojson.model';
import {
  DailyTrafficData,
  HourOfDay,
  RoadTrafficInfo,
  TrafficLevelMap,
} from '../models/traffic-data.model';
import { TrafficDataService } from '../services/traffic-data.service';

/**
 * 交通データの状態管理を行うストアクラス
 * フィーチャ間で共有される交通データの状態を管理します
 */
@Injectable({
  providedIn: 'root',
})
export class TrafficDataStore {
  private trafficDataService = inject(TrafficDataService);

  // 内部状態管理用のシグナル
  private readonly trafficDataSignal = signal<DailyTrafficData | null>(null);
  private readonly selectedHourSignal = signal<HourOfDay>(new Date().getHours() as HourOfDay);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly selectedRoadIdSignal = signal<string | null>(null);

  // 読み取り専用の公開シグナル
  public readonly trafficData = this.trafficDataSignal.asReadonly();
  public readonly selectedHour = this.selectedHourSignal.asReadonly();
  public readonly loading = this.loadingSignal.asReadonly();
  public readonly error = this.errorSignal.asReadonly();
  public readonly selectedRoadId = this.selectedRoadIdSignal.asReadonly();

  // 計算されたシグナル
  public readonly hasTrafficData = computed(() => !!this.trafficDataSignal());
  public readonly selectedRoadTrafficData = computed(() => {
    const roadId = this.selectedRoadIdSignal();
    const trafficData = this.trafficDataSignal();

    if (!roadId || !trafficData || !trafficData.hourlyData?.length) {
      return null;
    }

    // 選択された道路の全時間帯のトラフィックレベルを収集
    const roadTrafficData: TrafficLevelMap = {};

    trafficData.hourlyData.forEach(hourData => {
      const hour = hourData.hour.toString();
      if (hourData.trafficLevels && roadId in hourData.trafficLevels) {
        const level = hourData.trafficLevels[roadId];
        if (level !== undefined) {
          roadTrafficData[hour] = level;
        }
      }
    });

    return Object.keys(roadTrafficData).length > 0 ? roadTrafficData : null;
  });

  /**
   * 現在選択されている時間の交通混雑情報を取得します
   * @param roadData 道路のGeoJSONデータ
   * @returns 道路と交通レベルの情報配列
   */
  public getRoadTrafficInfo(roadData: FeatureCollection | null): RoadTrafficInfo[] {
    return this.trafficDataService.getRoadTrafficInfoForHour(
      roadData,
      this.trafficDataSignal(),
      this.selectedHourSignal()
    );
  }

  /**
   * 交通データを読み込みます
   * @param roadData 道路のGeoJSONデータ
   */
  public async loadTrafficData(roadData: FeatureCollection | null): Promise<void> {
    if (!roadData) {
      return;
    }

    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      const data = await this.trafficDataService.fetchTrafficData(roadData);
      this.trafficDataSignal.set(data);
    } catch (error) {
      console.error('交通データの取得に失敗しました', error);
      this.errorSignal.set('交通データの取得に失敗しました');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * 選択時間を変更します
   * @param hour 時間（0-23）
   */
  public selectHour(hour: HourOfDay): void {
    if (hour >= 0 && hour <= 23) {
      this.selectedHourSignal.set(hour);
    }
  }

  /**
   * 選択された道路IDを設定します
   * @param roadId 道路ID
   */
  public selectRoad(roadId: string | null): void {
    this.selectedRoadIdSignal.set(roadId);
  }

  /**
   * 交通データをクリアします
   */
  public clearTrafficData(): void {
    this.trafficDataSignal.set(null);
  }
}
