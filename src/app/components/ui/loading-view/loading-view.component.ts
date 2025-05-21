import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-view',
  standalone: true,
  templateUrl: './loading-view.component.html',
})
export class LoadingViewComponent {
  // 表示するメッセージ
  readonly message = input<string>('読み込み中...');
}
