import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-presentation',
  standalone: true,
  templateUrl: './loading-presentation.component.html',
})
export class LoadingPresentationComponent {
  // 表示するメッセージ
  readonly message = input<string>('読み込み中...');
}
