import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-view',
  standalone: true,
  templateUrl: './map-error-view.component.html',
})
export class MapErrorViewComponent {
  // エラーメッセージ
  readonly message = input<string>('エラーが発生しました');

  // 再試行ボタンのテキスト
  readonly retryText = input<string>('再試行');

  // 再試行ボタンがクリックされたときのイベント
  readonly retry = output<void>();
}
