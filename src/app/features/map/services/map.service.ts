import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import { FeatureCollection } from '../../../models/geojson.model';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private http = inject(HttpClient);

  // 地図データを保持するシグナル
  private mapDataSignal = signal<FeatureCollection | null>(null);

  // 公開用の読み取り専用シグナル
  readonly mapData = this.mapDataSignal.asReadonly();

  // 読み込み中状態を示すシグナル
  private loadingSignal = signal<boolean>(false);
  readonly loading = this.loadingSignal.asReadonly();

  // エラー状態を示すシグナル
  private errorSignal = signal<string | null>(null);
  readonly error = this.errorSignal.asReadonly();

  /**
   * 日本地図のGeoJSONデータを取得します
   */
  async fetchJapanMapData(): Promise<void> {
    if (this.loadingSignal()) {
      return;
    }

    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);

      // 非同期でGeoJSONファイルを取得
      const data = await firstValueFrom(
        this.http.get<FeatureCollection>('geojson/japan-map.geojson')
      );

      // データを更新
      this.mapDataSignal.set(data);
    } catch (error) {
      console.error('地図データの取得に失敗しました', error);
      this.errorSignal.set('地図データの取得に失敗しました');
      this.mapDataSignal.set(null);
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
