import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HourOfDay } from '../../../models/traffic-data.model';

/**
 * 交通時間選択コンポーネント
 * 時間帯（0-23時）を選択するためのスライダーUIを提供します
 * Presentationalコンポーネントとして、親コンポーネントからの入力を表示し、
 * ユーザー操作による変更を出力シグナルで通知します
 */
@Component({
  selector: 'app-traffic-time-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './traffic-time-selector.component.html',
})
export class TrafficTimeSelectorComponent {
  /**
   * 入力: 現在選択されている時間（0-23）
   * 親コンポーネントから提供される現在選択中の時間
   */
  readonly selectedHour = input<HourOfDay>(new Date().getHours() as HourOfDay);

  /**
   * 出力: 時間が変更されたときに発火するイベント
   * 新しく選択された時間を親コンポーネントに通知します
   */
  readonly hourChange = output<HourOfDay>();

  /**
   * 時間帯によるラベル表示
   * 0-5: 深夜, 6-11: 午前, 12-17: 午後, 18-23: 夜間
   */
  protected getPeriodLabel(hour: number): string {
    if (hour >= 0 && hour < 6) return '深夜';
    if (hour >= 6 && hour < 12) return '午前';
    if (hour >= 12 && hour < 18) return '午後';
    return '夜間';
  }

  /**
   * 時間を「時間:00」形式で表示するためのメソッド
   * @param hour 時間（0-23）
   * @returns フォーマットされた時間文字列 (例: "14:00")
   */
  protected formatHour(hour: number): string {
    return `${hour}:00`;
  }

  /**
   * 時間選択スライダーの変更ハンドラー
   * ユーザーがスライダーを操作したときに呼び出され、選択された時間を親コンポーネントに通知します
   * @param event DOM イベント
   */
  protected onHourChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const hourValue = parseInt(input.value, 10) as HourOfDay;
      this.hourChange.emit(hourValue);
    }
  }
}
