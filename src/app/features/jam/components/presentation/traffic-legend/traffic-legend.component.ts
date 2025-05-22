import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import {
  TrafficLevel,
  getTrafficLevelColor,
  getTrafficLevelLabel,
} from '../../../models/traffic-level.model';

@Component({
  selector: 'app-traffic-legend',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './traffic-legend.component.html',
})
export class TrafficLegendComponent {
  // 凡例に表示する交通レベル
  // NO_DATAとレベル1、5、10を表示する（コンパクトに）
  protected readonly legendLevels = [
    TrafficLevel.NO_DATA,
    TrafficLevel.LEVEL_1,
    TrafficLevel.LEVEL_5,
    TrafficLevel.LEVEL_10,
  ];

  // 各レベルの色を取得
  protected getColorForLevel(level: TrafficLevel): string {
    return getTrafficLevelColor(level);
  }

  // 各レベルのラベルを取得
  protected getLabelForLevel(level: TrafficLevel): string {
    return getTrafficLevelLabel(level);
  }
}
