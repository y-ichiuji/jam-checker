import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-presentation',
  standalone: true,
  templateUrl: './error-presentation.component.html',
})
export class ErrorPresentationComponent {
  // エラーメッセージ
  readonly message = input<string>('エラーが発生しました');

  // 再試行ボタンのテキスト
  readonly retryText = input<string>('再試行');

  // 再試行ボタンがクリックされたときのイベント
  readonly retry = output<void>();
}
