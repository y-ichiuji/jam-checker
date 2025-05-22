import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { HourOfDay } from '../../../models/traffic-data.model';
import { TrafficDataStore } from '../../../stores/traffic-data.store';
import { TrafficLegendComponent } from '../../presentation/traffic-legend/traffic-legend.component';
import { TrafficTimeSelectorComponent } from '../../presentation/traffic-time-selector/traffic-time-selector.component';

@Component({
  selector: 'app-traffic-controls-container',
  standalone: true,
  imports: [CommonModule, TrafficTimeSelectorComponent, TrafficLegendComponent],
  templateUrl: './traffic-controls-container.component.html',
})
export class TrafficControlsContainerComponent {
  private readonly trafficDataStore = inject(TrafficDataStore);

  // TrafficDataStoreからの選択時間を公開
  protected readonly selectedHour = this.trafficDataStore.selectedHour;

  // TrafficDataStoreからのローディング状態を公開
  protected readonly loading = this.trafficDataStore.loading;

  /**
   * 時間変更イベントのハンドラー
   * @param hour 選択された時間（0-23）
   */
  protected handleHourChange(hour: HourOfDay): void {
    this.trafficDataStore.selectHour(hour);
  }
}
