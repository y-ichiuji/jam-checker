import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { firstValueFrom, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

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

  /**
   * 道路のGeoJSONデータを取得します
   * geojson/road/ディレクトリ内の全てのGeoJSONファイルを読み込んで結合します
   * @returns 結合された道路GeoJSONデータのPromise
   */
  async fetchRoadData(): Promise<FeatureCollection> {
    try {
      // ファイル番号の範囲（01から47まで）
      const fileNumbers = Array.from({ length: 47 }, (_, i) => (i + 1).toString().padStart(2, '0'));

      // 各ファイルのパスを生成
      const filePaths = fileNumbers.map(num => `geojson/road/N12-21_${num}.geojson`);

      // 全てのファイルを並行して取得するためのObservable配列を作成
      const requests = filePaths.map(path => this.http.get<FeatureCollection>(path));

      // 全てのリクエストが完了するまで待機し、結果をマージ
      const mergedData = await firstValueFrom(
        forkJoin(requests).pipe(
          map(collections => {
            // 空のFeatureCollectionを作成
            const mergedCollection: FeatureCollection = {
              type: 'FeatureCollection',
              features: [],
            };

            // 全てのコレクションからfeaturesを抽出して結合
            collections.forEach(collection => {
              if (collection && collection.features) {
                mergedCollection.features = mergedCollection.features.concat(collection.features);
              }
            });

            return mergedCollection;
          })
        )
      );

      return mergedData;
    } catch (error) {
      console.error('道路データの取得に失敗しました', error);
      throw new Error('道路データの取得に失敗しました');
    }
  }
}
