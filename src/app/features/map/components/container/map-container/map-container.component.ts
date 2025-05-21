import { Component, OnInit, inject } from '@angular/core';

import { MapService } from '../../../services/map.service';
import { MapViewComponent } from '../../presentation/map-view/map-view.component';

@Component({
  selector: 'app-map-container',
  standalone: true,
  imports: [MapViewComponent],
  templateUrl: './map-container.component.html',
  styles: ``,
})
export class MapContainerComponent implements OnInit {
  private mapService = inject(MapService);

  // MapServiceから地図データを取得
  protected mapData = this.mapService.mapData;

  // 読み込み中状態
  protected loading = this.mapService.loading;

  // エラー状態
  protected error = this.mapService.error;

  ngOnInit(): void {
    // コンポーネント初期化時に地図データを取得
    this.loadMapData();
  }

  protected async loadMapData(): Promise<void> {
    await this.mapService.fetchJapanMapData();
  }

  protected handleMapClick(event: { x: number; y: number }): void {
    console.log('Map clicked at:', event);
  }
}
