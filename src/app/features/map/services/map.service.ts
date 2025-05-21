import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { FeatureCollection } from '../../../models/geojson.model';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private http = inject(HttpClient);

  /**
   * 世界地図のGeoJSONデータを取得します
   * @returns GeoJSONデータのPromise
   */
  async fetchWorldMapData(): Promise<FeatureCollection> {
    try {
      // 非同期でGeoJSONファイルを取得
      return await firstValueFrom(this.http.get<FeatureCollection>('geojson/world-map.geojson'));
    } catch (error) {
      console.error('地図データの取得に失敗しました', error);
      throw new Error('地図データの取得に失敗しました');
    }
  }
}
