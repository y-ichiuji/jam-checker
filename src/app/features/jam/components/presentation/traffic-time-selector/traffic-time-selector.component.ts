import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, fromEvent } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import { HourOfDay } from '../../../models/traffic-data.model';

/**
 * タイムセレクター内で使用する定数
 */
const TIME_SELECTOR_CONSTANTS = {
  /** Canvas描画の余白（ピクセル） */
  PADDING: 10,
  /** 時間マーカーの半径（ピクセル） */
  MARKER_RADIUS: 10,
  /** タイムラインの高さ（ピクセル） */
  TIMELINE_HEIGHT: 6,
  /** ポインターイベントの間引き時間（ミリ秒） */
  POINTER_THROTTLE_MS: 16,
  /** 時間帯の色（深夜、午前、午後、夜間） */
  PERIOD_COLORS: ['#c7d2fe', '#93c5fd', '#fdba74', '#c4b5fd'],
  /** 選択マーカーの色 */
  MARKER_COLOR: '#2563eb',
  /** マーカーの境界線の色 */
  MARKER_BORDER_COLOR: '#ffffff',
  /** マーカーの境界線の幅 */
  MARKER_BORDER_WIDTH: 2,
  /** テキスト色 */
  TEXT_COLOR: '#374151',
  /** 小さなマーカー（時間ごと）の高さ */
  HOUR_MARKER_HEIGHT: 4,
};

/**
 * 交通時間選択コンポーネント
 * Canvasを使った時間帯（0-23時）を選択するためのスライダーUIを提供します
 * Presentationalコンポーネントとして、親コンポーネントからの入力を表示し、
 * ユーザー操作による変更を出力シグナルで通知します
 */
@Component({
  selector: 'app-traffic-time-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './traffic-time-selector.component.html',
})
export class TrafficTimeSelectorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('timeCanvas') timeCanvasRef!: ElementRef<HTMLCanvasElement>;

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

  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private subscriptions = new Subscription();

  // ドラッグ操作用の状態変数
  private isDragging = false;
  private tempSelectedHour: HourOfDay | null = null;

  constructor() {
    // 選択時間が変更された時にcanvasを再描画
    effect(() => {
      this.selectedHour();
      if (this.context) {
        this.drawTimeline();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    // ResizeObserverの監視を解除
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // RxJSサブスクリプションの解除
    this.subscriptions.unsubscribe();
  }

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
   * キーボードでの操作ハンドラー
   */
  protected handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.decrementHour();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.incrementHour();
        break;
    }
  }

  /**
   * 1時間減らす
   */
  protected decrementHour(): void {
    const currentHour = this.selectedHour();
    const newHour = (currentHour === 0 ? 23 : currentHour - 1) as HourOfDay;
    this.hourChange.emit(newHour);
  }

  /**
   * 1時間増やす
   */
  protected incrementHour(): void {
    const currentHour = this.selectedHour();
    const newHour = (currentHour === 23 ? 0 : currentHour + 1) as HourOfDay;
    this.hourChange.emit(newHour);
  }

  /**
   * キーボード入力での時間変更ハンドラー
   */
  protected onKeyboardInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const hourValue = Math.max(0, Math.min(23, parseInt(input.value, 10))) as HourOfDay;
      this.hourChange.emit(hourValue);
    }
  }

  /**
   * Canvasの初期化
   */
  private initializeCanvas(): void {
    const canvas = this.timeCanvasRef.nativeElement;
    this.context = canvas.getContext('2d');

    // キャンバスのサイズを設定
    this.resizeCanvas();

    // ResizeObserverを設定
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
    });

    // キャンバスの親要素を監視
    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
  }

  /**
   * キャンバスのリサイズ処理
   */
  private resizeCanvas(): void {
    if (!this.context) return;

    const canvas = this.timeCanvasRef.nativeElement;
    const parent = canvas.parentElement;

    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      // サイズ変更後にタイムラインを再描画
      this.drawTimeline();
    }
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    const canvas = this.timeCanvasRef?.nativeElement;
    if (!canvas) return;

    // マウスダウン/タッチスタート - ドラッグ開始
    this.subscriptions.add(
      fromEvent<MouseEvent>(canvas, 'mousedown').subscribe(event => {
        event.preventDefault();
        this.isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        this.updateTempHour(x);
      })
    );

    // タッチスタート
    this.subscriptions.add(
      fromEvent<TouchEvent>(canvas, 'touchstart').subscribe(event => {
        event.preventDefault();
        this.isDragging = true;
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        if (touch) {
          const x = touch.clientX - rect.left;
          this.updateTempHour(x);
        }
      })
    );

    // マウス移動 - ドラッグ中
    this.subscriptions.add(
      fromEvent<MouseEvent>(window, 'mousemove')
        .pipe(throttleTime(TIME_SELECTOR_CONSTANTS.POINTER_THROTTLE_MS))
        .subscribe(event => {
          if (!this.isDragging) return;

          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          this.updateTempHour(x);
        })
    );

    // タッチ移動
    this.subscriptions.add(
      fromEvent<TouchEvent>(window, 'touchmove')
        .pipe(throttleTime(TIME_SELECTOR_CONSTANTS.POINTER_THROTTLE_MS))
        .subscribe(event => {
          if (!this.isDragging) return;

          const rect = canvas.getBoundingClientRect();
          const touch = event.touches[0];
          if (touch) {
            const x = touch.clientX - rect.left;
            this.updateTempHour(x);
          }
        })
    );

    // マウスアップ/タッチエンド - ドラッグ終了、時間を確定してクエリ実行
    this.subscriptions.add(
      fromEvent<MouseEvent>(window, 'mouseup').subscribe(() => {
        if (this.isDragging && this.tempSelectedHour !== null) {
          this.isDragging = false;
          const newHour = this.tempSelectedHour;
          this.tempSelectedHour = null;
          // ここでのみ実際の時間変更イベントを発火（クエリ実行のトリガー）
          if (newHour !== this.selectedHour()) {
            this.hourChange.emit(newHour);
          }
        }
      })
    );

    // タッチエンド
    this.subscriptions.add(
      fromEvent<TouchEvent>(window, 'touchend').subscribe(() => {
        if (this.isDragging && this.tempSelectedHour !== null) {
          this.isDragging = false;
          const newHour = this.tempSelectedHour;
          this.tempSelectedHour = null;
          // ここでのみ実際の時間変更イベントを発火（クエリ実行のトリガー）
          if (newHour !== this.selectedHour()) {
            this.hourChange.emit(newHour);
          }
        }
      })
    );

    // クリックイベント（ドラッグでない場合のみ）
    this.subscriptions.add(
      fromEvent<MouseEvent>(canvas, 'click').subscribe(event => {
        // ドラッグ操作の後のクリックイベントは無視（既に処理済み）
        if (!this.isDragging) {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          this.handleTimelineClick(x);
        }
      })
    );

    // ホイールスクロールイベント
    this.subscriptions.add(
      fromEvent<WheelEvent>(canvas, 'wheel').subscribe(event => {
        event.preventDefault();
        if (event.deltaY < 0) {
          this.incrementHour();
        } else {
          this.decrementHour();
        }
      })
    );
  }

  /**
   * タイムライン上のクリック位置から時間を計算して更新
   */
  private handleTimelineClick(x: number): void {
    const canvas = this.timeCanvasRef.nativeElement;
    const width = canvas.width - TIME_SELECTOR_CONSTANTS.PADDING * 2;
    const relativeX = x - TIME_SELECTOR_CONSTANTS.PADDING;

    // クリックされた位置をキャンバス内の相対位置（0-1）に変換
    const positionRatio = Math.max(0, Math.min(1, relativeX / width));

    // 位置から時間を計算（0-23）
    const newHour = Math.min(23, Math.floor(positionRatio * 24)) as HourOfDay;

    if (newHour !== this.selectedHour()) {
      this.hourChange.emit(newHour);
    }
  }

  /**
   * ドラッグ中の一時的な時間更新（視覚的な更新のみ）
   */
  private updateTempHour(x: number): void {
    const canvas = this.timeCanvasRef.nativeElement;
    const width = canvas.width - TIME_SELECTOR_CONSTANTS.PADDING * 2;
    const relativeX = Math.max(0, x - TIME_SELECTOR_CONSTANTS.PADDING);

    // 位置の比率を計算（0-1の範囲に収める）
    const positionRatio = Math.max(0, Math.min(1, relativeX / width));

    // 位置から時間を計算（0-23）
    const hour = Math.min(23, Math.floor(positionRatio * 24)) as HourOfDay;

    // 一時的な選択時間を更新
    if (this.tempSelectedHour !== hour) {
      this.tempSelectedHour = hour;
      // 視覚的な更新のみ行う
      this.drawTimeline();
    }
  }

  /**
   * タイムラインの描画
   */
  private drawTimeline(): void {
    const ctx = this.context;
    const canvas = this.timeCanvasRef.nativeElement;
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padding = TIME_SELECTOR_CONSTANTS.PADDING;
    const width = canvas.width - padding * 2;
    const centerY = canvas.height / 2;

    // 時間帯の背景を描画（深夜、午前、午後、夜間）
    this.drawPeriodBackgrounds(ctx, padding, centerY, width);

    // 各時間のマーカーを描画
    this.drawHourMarkers(ctx, padding, centerY, width);

    // 現在選択されている時間のマーカーを描画
    this.drawSelectedTimeMarker(ctx, padding, centerY, width);
  }

  /**
   * 時間帯の背景を描画
   */
  private drawPeriodBackgrounds(
    ctx: CanvasRenderingContext2D,
    padding: number,
    centerY: number,
    width: number
  ): void {
    const timelineHeight = TIME_SELECTOR_CONSTANTS.TIMELINE_HEIGHT;
    const periods = [6, 6, 6, 6]; // 各時間帯の長さ（深夜、午前、午後、夜間）
    let startX = padding;

    // 各時間帯の背景を描画
    periods.forEach((hours, index) => {
      const periodWidth = (width * hours) / 24;
      ctx.fillStyle = TIME_SELECTOR_CONSTANTS.PERIOD_COLORS[index]!;

      // 角丸の長方形を描画
      const radius = timelineHeight / 2;
      ctx.beginPath();

      // 左端の描画（最初の時間帯は左側を丸く）
      if (index === 0) {
        ctx.moveTo(startX + radius, centerY - timelineHeight / 2);
        ctx.arcTo(startX, centerY - timelineHeight / 2, startX, centerY, radius);
        ctx.arcTo(
          startX,
          centerY + timelineHeight / 2,
          startX + radius,
          centerY + timelineHeight / 2,
          radius
        );
      } else {
        ctx.moveTo(startX, centerY - timelineHeight / 2);
        ctx.lineTo(startX, centerY + timelineHeight / 2);
      }

      // 右端の描画（最後の時間帯は右側を丸く）
      if (index === periods.length - 1) {
        ctx.lineTo(startX + periodWidth - radius, centerY + timelineHeight / 2);
        ctx.arcTo(
          startX + periodWidth,
          centerY + timelineHeight / 2,
          startX + periodWidth,
          centerY,
          radius
        );
        ctx.arcTo(
          startX + periodWidth,
          centerY - timelineHeight / 2,
          startX + periodWidth - radius,
          centerY - timelineHeight / 2,
          radius
        );
      } else {
        ctx.lineTo(startX + periodWidth, centerY + timelineHeight / 2);
        ctx.lineTo(startX + periodWidth, centerY - timelineHeight / 2);
      }

      ctx.closePath();
      ctx.fill();

      // 次の時間帯の開始位置
      startX += periodWidth;
    });
  }

  /**
   * 時間ごとのマーカーを描画
   */
  private drawHourMarkers(
    ctx: CanvasRenderingContext2D,
    padding: number,
    centerY: number,
    width: number
  ): void {
    const timelineHeight = TIME_SELECTOR_CONSTANTS.TIMELINE_HEIGHT;
    const hourMarkerHeight = TIME_SELECTOR_CONSTANTS.HOUR_MARKER_HEIGHT;

    // すべての時間（0-23）に対してマーカーを描画
    for (let hour = 0; hour <= 23; hour++) {
      const x = padding + (width * hour) / 24;

      // 偶数時間の場合は少し目立たせる
      const markerHeight = hour % 3 === 0 ? hourMarkerHeight * 2 : hourMarkerHeight;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(x - 0.5, centerY - timelineHeight / 2 - markerHeight, 1, markerHeight);

      // 重要な時間（0, 6, 12, 18）には数字も表示
      if (hour % 6 === 0) {
        ctx.fillStyle = TIME_SELECTOR_CONSTANTS.TEXT_COLOR;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${hour}`, x, centerY - timelineHeight / 2 - markerHeight - 5);
      }
    }
  }

  /**
   * 選択時間のマーカーを描画
   */
  private drawSelectedTimeMarker(
    ctx: CanvasRenderingContext2D,
    padding: number,
    centerY: number,
    width: number
  ): void {
    // ドラッグ中は一時選択時間を使用、そうでなければ実際の選択時間を使用
    const displayHour =
      this.isDragging && this.tempSelectedHour !== null
        ? this.tempSelectedHour
        : this.selectedHour();

    const markerRadius = TIME_SELECTOR_CONSTANTS.MARKER_RADIUS;

    // 選択時間の位置を計算
    const markerX = padding + (width * displayHour) / 24 + width / 24 / 2;
    const markerY = centerY;

    // 選択マーカーの影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // 選択マーカーの背景（白い円）
    ctx.beginPath();
    ctx.arc(markerX, markerY, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = TIME_SELECTOR_CONSTANTS.MARKER_BORDER_COLOR;
    ctx.fill();

    // 影をリセット
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // 選択マーカー本体（青い円）
    ctx.beginPath();
    ctx.arc(
      markerX,
      markerY,
      markerRadius - TIME_SELECTOR_CONSTANTS.MARKER_BORDER_WIDTH,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = TIME_SELECTOR_CONSTANTS.MARKER_COLOR;
    ctx.fill();

    // 選択時間のテキスト表示
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayHour.toString(), markerX, markerY);
  }
}
