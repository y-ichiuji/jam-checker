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

import { HourOfDay, TrafficLevelMap } from '../../../models/traffic-data.model';
import { TrafficLevel, getTrafficLevelColor } from '../../../models/traffic-level.model';

/**
 * タイムセレクター内で使用する定数
 */
const TIME_SELECTOR_CONSTANTS = {
  /** Canvas描画の余白（ピクセル） */
  PADDING: 10,
  /** 時間マーカーの半径（ピクセル） */
  MARKER_RADIUS: 12,
  /** タイムラインの高さ（ピクセル） */
  TIMELINE_HEIGHT: 8,
  /** ポインターイベントの間引き時間（ミリ秒） */
  POINTER_THROTTLE_MS: 16,
  /** 選択マーカーの色 */
  MARKER_COLOR: '#2563eb',
  /** マーカーの境界線の色 */
  MARKER_BORDER_COLOR: '#ffffff',
  /** マーカーの境界線の幅 */
  MARKER_BORDER_WIDTH: 2,
  /** テキスト色 */
  TEXT_COLOR: '#374151',
  /** 小さなマーカー（時間ごと）の高さ */
  HOUR_MARKER_HEIGHT: 6,
  /** 1時間あたりのピクセル幅 */
  HOUR_WIDTH: 50,
  /** アニメーション期間（ミリ秒） */
  ANIMATION_DURATION: 300,
};

/**
 * 交通時間選択コンポーネント
 * Canvasを使った時間帯（0-23時）を選択するためのスライダーUIを提供します
 * 逆スクロール方式：マーカーを固定し、タイムラインをスクロールする実装
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
   * 入力: 選択された道路の交通データ
   * 道路IDと24時間分の交通レベルのマッピング（null = 道路未選択）
   */
  readonly selectedRoadTrafficData = input<TrafficLevelMap | null>(null);

  /**
   * 出力: 時間が変更されたときに発火するイベント
   * 新しく選択された時間を親コンポーネントに通知します
   */
  readonly hourChange = output<HourOfDay>();

  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private subscriptions = new Subscription();

  // タイムラインのオフセット位置（スクロール位置）を管理
  private timelineOffset = 0;

  // ドラッグ操作用の状態変数
  private isDragging = false;
  private tempSelectedHour: HourOfDay | null = null;

  // アニメーション用の状態変数
  private isAnimating = false;
  private animationStartTime = 0;
  private animationStartOffset = 0;
  private animationTargetOffset = 0;
  private animationFrameId = 0;

  constructor() {
    // 選択時間が変更された時にタイムラインを更新
    effect(() => {
      const hour = this.selectedHour();
      if (this.context && !this.isDragging && !this.isAnimating) {
        // 選択された時間がマーカー（中央）に来るようにオフセットを設定
        this.animateToHour(hour);
      }
    });

    // 選択された道路の交通データが変更された時にタイムラインを再描画
    effect(() => {
      // selectedRoadTrafficDataの変更を監視
      this.selectedRoadTrafficData();
      // コンテキストが初期化されていれば再描画
      if (this.context) {
        this.drawTimeline();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initializeCanvas();
    this.setupEventListeners();

    // 初期表示時にタイムラインを選択時間に合わせて配置
    const hour = this.selectedHour();
    this.setTimelineOffsetForHour(hour);
    this.drawTimeline();
  }

  ngOnDestroy(): void {
    // ResizeObserverの監視を解除
    this.resizeObserver?.disconnect();

    // アニメーションフレームをキャンセル
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // RxJSサブスクリプションの解除
    this.subscriptions.unsubscribe();
  }

  // 時間帯ラベルメソッドは削除

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
   * pointerイベントを使用して、マウス/タッチ/ペンなどの入力を統一的に処理
   */
  private setupEventListeners(): void {
    const canvas = this.timeCanvasRef?.nativeElement;
    if (!canvas) return;

    // pointerdown - ドラッグ開始
    this.subscriptions.add(
      fromEvent<PointerEvent>(canvas, 'pointerdown').subscribe(event => {
        event.preventDefault();
        this.isDragging = true;

        // アニメーションがあれば停止
        if (this.isAnimating) {
          this.isAnimating = false;
          cancelAnimationFrame(this.animationFrameId);
        }

        // ポインターキャプチャを設定（要素外でもイベントを捕捉）
        canvas.setPointerCapture(event.pointerId);
      })
    );

    // pointermove - タイムラインをスクロール
    this.subscriptions.add(
      fromEvent<PointerEvent>(window, 'pointermove')
        .pipe(throttleTime(TIME_SELECTOR_CONSTANTS.POINTER_THROTTLE_MS))
        .subscribe(event => {
          if (!this.isDragging) return;

          // movementXを使用して直接移動量を取得（より効率的）
          this.updateTimelineOffset(this.timelineOffset + event.movementX);

          // タイムライン位置から、表示中の現在時刻（マーカー位置=中央）を計算して表示
          this.updateTempHourFromOffset();
        })
    );

    // pointerup - ドラッグ終了、時間を確定してクエリ実行
    this.subscriptions.add(
      fromEvent<PointerEvent>(window, 'pointerup').subscribe(event => {
        if (this.isDragging) {
          this.isDragging = false;

          // キャンバス要素があれば、ポインターキャプチャを解放
          if (canvas) {
            try {
              canvas.releasePointerCapture(event.pointerId);
            } catch {
              // ポインターキャプチャがない場合のエラーを無視
            }
          }

          // 一時的な選択時間をクリア
          this.tempSelectedHour = null;

          // 現在のタイムラインオフセットから、画面中央（マーカーのある位置）の時刻を計算
          const centerHour = this.calculateHourFromOffset() as HourOfDay;

          // ドラッグ終了時の状態を確保するためにまずイベントを発火
          // この時点で時間変更イベントを先に発行することで、状態の同期を確実にする
          if (centerHour !== this.selectedHour()) {
            this.hourChange.emit(centerHour);
          }

          // 中心の時間にスナップ（イベント発火後にアニメーション）
          this.animateToHour(centerHour);
        }
      })
    );

    // pointercancel - ドラッグキャンセル（システムによる中断など）
    this.subscriptions.add(
      fromEvent<PointerEvent>(window, 'pointercancel').subscribe(event => {
        if (this.isDragging) {
          this.isDragging = false;
          this.tempSelectedHour = null;

          // キャンバス要素があれば、ポインターキャプチャを解放
          if (canvas) {
            try {
              canvas.releasePointerCapture(event.pointerId);
            } catch {
              // ポインターキャプチャがない場合のエラーを無視
            }
          }

          // 現在のマーカー位置の時刻に設定
          const centerHour = this.calculateHourFromOffset() as HourOfDay;

          // 時間が変わった場合、先にイベントを発行してからアニメーション
          if (centerHour !== this.selectedHour()) {
            this.hourChange.emit(centerHour);
          }

          // 選択された時間に合わせてアニメーションで調整
          this.animateToHour(centerHour);
        }
      })
    );

    // click - 時間を中央に配置
    this.subscriptions.add(
      fromEvent<PointerEvent>(canvas, 'click').subscribe(event => {
        // ドラッグ操作の後のクリックイベントは無視（既に処理済み）
        if (!this.isDragging) {
          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          // 既にアニメーション中の場合はキャンセルして新しいアニメーションを開始
          if (this.isAnimating) {
            cancelAnimationFrame(this.animationFrameId);
            this.isAnimating = false;
          }
          this.handleTimelineClick(x);
        }
      })
    );

    // wheel - ホイールスクロール
    this.subscriptions.add(
      fromEvent<WheelEvent>(canvas, 'wheel').subscribe(event => {
        event.preventDefault();

        // ホイールの方向に応じてタイムラインをスクロール
        const delta =
          event.deltaY > 0
            ? -TIME_SELECTOR_CONSTANTS.HOUR_WIDTH
            : TIME_SELECTOR_CONSTANTS.HOUR_WIDTH;
        this.updateTimelineOffset(this.timelineOffset + delta);

        // タイムライン位置から時間を計算
        const hour = this.calculateHourFromOffset() as HourOfDay;

        // 時間が変わった場合、先にイベントを発行してから、アニメーションを実行
        if (hour !== this.selectedHour()) {
          this.hourChange.emit(hour);
          // ホイール操作後も正確な位置にスナップさせる
          this.animateToHour(hour);
        }
      })
    );
  }

  /**
   * タイムライン上のクリック位置に対応する時間を中央に配置
   */
  private handleTimelineClick(x: number): void {
    // クリック位置から時間を計算
    const hourWidth = TIME_SELECTOR_CONSTANTS.HOUR_WIDTH;
    const totalWidth = hourWidth * 24;
    let clickPos = (x - this.timelineOffset) % totalWidth;
    if (clickPos < 0) clickPos += totalWidth;

    // 位置から時間を計算（小数点以下を含む）
    const exactHour = clickPos / hourWidth;

    // 12:29をクリックした時は12:00、12:30をクリックした時は13:00に補正
    let clickedHour: HourOfDay;
    if (exactHour - Math.floor(exactHour) < 0.5) {
      // 0.5未満は下の時間（例: 12.3 → 12）
      clickedHour = Math.floor(exactHour) as HourOfDay;
    } else {
      // 0.5以上は上の時間（例: 12.7 → 13）
      clickedHour = Math.ceil(exactHour) as HourOfDay;
    }

    // 24時間表記に調整
    clickedHour = (((clickedHour % 24) + 24) % 24) as HourOfDay;

    // 時間が変わった場合、先にイベントを発火してからアニメーション
    if (clickedHour !== this.selectedHour()) {
      this.hourChange.emit(clickedHour);
    }

    // 選択された時間に合わせてアニメーションで調整
    this.animateToHour(clickedHour);
  }

  /**
   * タイムラインのオフセット位置を更新
   */
  private updateTimelineOffset(newOffset: number): void {
    this.timelineOffset = newOffset;
    this.drawTimeline();
  }

  /**
   * 現在のタイムラインオフセットから表示時間を計算
   */
  private updateTempHourFromOffset(): void {
    const hour = this.calculateHourFromOffset() as HourOfDay;

    if (this.tempSelectedHour !== hour) {
      this.tempSelectedHour = hour;
      this.drawTimeline();
    }
  }

  /**
   * 指定されたオフセット位置から時間を計算
   * デフォルトでは現在のオフセット位置を使用
   */
  private calculateHourFromOffset(offset: number = this.timelineOffset): number {
    const canvas = this.timeCanvasRef.nativeElement;
    const centerX = canvas.width / 2;
    const totalWidth = TIME_SELECTOR_CONSTANTS.HOUR_WIDTH * 24;
    const hourWidth = TIME_SELECTOR_CONSTANTS.HOUR_WIDTH;

    // オフセットを考慮した中央位置の時間を計算
    let hourPosition = (centerX - offset) % totalWidth;

    // 負の値を正の値に変換（24時間周期を維持）
    if (hourPosition < 0) {
      hourPosition += totalWidth;
    }

    // 時間区間の中央を基準に時間を計算
    // hourPosition から HOUR_WIDTH/2 を引くことで、区間の中央ではなく開始位置を基準とした計算に変更
    let adjustedPosition = hourPosition - hourWidth / 2;
    if (adjustedPosition < 0) {
      adjustedPosition += totalWidth;
    }

    // 位置から正確な時間を計算（小数点以下を含む）
    const exactHour = adjustedPosition / hourWidth;

    // 12:29をクリックした時は12:00、12:30をクリックした時は13:00に補正
    // 小数点以下が0.5未満なら切り捨て、0.5以上なら切り上げ
    let hour: number;
    if (exactHour - Math.floor(exactHour) < 0.5) {
      // 0.5未満は下の時間（例: 12.3 → 12）
      hour = Math.floor(exactHour);
    } else {
      // 0.5以上は上の時間（例: 12.7 → 13）
      hour = Math.ceil(exactHour);
    }

    // 24時間表記に調整（負の値や24以上の値を0-23の範囲に収める）
    return ((hour % 24) + 24) % 24;
  }

  /**
   * 指定された時間が中央に表示されるようにオフセットを設定
   */
  private setTimelineOffsetForHour(hour: HourOfDay): void {
    const canvas = this.timeCanvasRef.nativeElement;
    const centerX = canvas.width / 2;

    // 中央に時間を表示するために必要なオフセットを計算
    this.timelineOffset =
      centerX -
      (hour * TIME_SELECTOR_CONSTANTS.HOUR_WIDTH + TIME_SELECTOR_CONSTANTS.HOUR_WIDTH / 2);
  }

  /**
   * 指定された時間へアニメーションでスクロール
   */
  private animateToHour(hour: HourOfDay): void {
    const canvas = this.timeCanvasRef.nativeElement;
    const centerX = canvas.width / 2;

    // 目標のオフセット位置を計算（指定時間が中央に来る位置）
    const targetOffset =
      centerX -
      (hour * TIME_SELECTOR_CONSTANTS.HOUR_WIDTH + TIME_SELECTOR_CONSTANTS.HOUR_WIDTH / 2);

    this.animateTimelineOffset(targetOffset);
  }

  /**
   * タイムラインを指定オフセットへアニメーションで移動
   */
  private animateTimelineOffset(targetOffset: number): void {
    // アニメーションが不要な場合（ターゲット位置が現在位置と同じ場合）はスキップ
    if (Math.abs(this.timelineOffset - targetOffset) < 1) {
      return;
    }

    // 現在実行中のアニメーションをキャンセル
    if (this.isAnimating) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // スムーズなアニメーションを有効化
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animationStartOffset = this.timelineOffset;
    this.animationTargetOffset = targetOffset;

    const animate = (currentTime: number): void => {
      if (!this.isAnimating) return;

      const elapsed = currentTime - this.animationStartTime;
      const duration = TIME_SELECTOR_CONSTANTS.ANIMATION_DURATION;

      if (elapsed < duration) {
        // イージング関数（ease-out）を適用
        const progress = 1 - Math.pow(1 - elapsed / duration, 2);
        const newOffset =
          this.animationStartOffset +
          progress * (this.animationTargetOffset - this.animationStartOffset);

        this.updateTimelineOffset(newOffset);
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        // アニメーション完了
        this.updateTimelineOffset(this.animationTargetOffset);
        this.isAnimating = false;
      }
    };

    // 次のフレームでアニメーションを開始
    this.animationFrameId = requestAnimationFrame(animate);
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
    const centerY = canvas.height / 2;
    const centerX = canvas.width / 2;

    // 表示する全体の幅（24時間分）
    const totalWidth = TIME_SELECTOR_CONSTANTS.HOUR_WIDTH * 24;

    // 時間帯の背景を描画（深夜、午前、午後、夜間）
    this.drawPeriodBackgrounds(ctx, padding, centerY, totalWidth);

    // 各時間のマーカーを描画
    this.drawHourMarkers(ctx, padding, centerY, totalWidth);

    // 中央位置のマーカーを描画（固定）
    this.drawFixedCenterMarker(ctx, centerX, centerY);
  }

  /**
   * 時間帯の背景を描画
   * 道路が選択されている場合は交通混雑レベルに基づいて背景色を設定
   * 道路が選択されていない場合は単一色の背景を設定
   */
  private drawPeriodBackgrounds(
    ctx: CanvasRenderingContext2D,
    padding: number,
    centerY: number,
    totalWidth: number
  ): void {
    const timelineHeight = TIME_SELECTOR_CONSTANTS.TIMELINE_HEIGHT;
    const hourWidth = TIME_SELECTOR_CONSTANTS.HOUR_WIDTH;

    // 道路が選択されているかどうかで描画方法を切り替え
    const selectedRoadData = this.selectedRoadTrafficData();

    if (selectedRoadData && Object.keys(selectedRoadData).length > 0) {
      // 選択された道路がある場合は、時間ごとの交通混雑レベルに基づいて色を設定
      this.drawTrafficLevelBackground(ctx, centerY, totalWidth, hourWidth, timelineHeight);
    } else {
      // 道路が選択されていない場合は、単一色のシンプルな背景を表示
      this.drawSimpleBackground(ctx, centerY, totalWidth, hourWidth, timelineHeight);
    }
  }

  /**
   * 道路の交通混雑レベルに基づく時間帯背景の描画
   */
  private drawTrafficLevelBackground(
    ctx: CanvasRenderingContext2D,
    centerY: number,
    totalWidth: number,
    hourWidth: number,
    timelineHeight: number
  ): void {
    const roadTrafficData = this.selectedRoadTrafficData();
    if (!roadTrafficData) return;

    // 時間帯を3つ描画（循環表示のために前後を含む）
    for (let offset = -1; offset <= 1; offset++) {
      // 24時間分の背景を描画
      for (let hour = 0; hour < 24; hour++) {
        const startX = this.timelineOffset + hour * hourWidth + offset * totalWidth;

        // 時間に対応する交通レベルを取得
        const hourKey = hour.toString();
        let trafficLevel = TrafficLevel.NO_DATA;

        if (hourKey in roadTrafficData) {
          trafficLevel = roadTrafficData[hourKey] as TrafficLevel;
        }

        // 交通混雑レベルから色を取得
        ctx.fillStyle = getTrafficLevelColor(trafficLevel);

        // シンプルな長方形を描画
        ctx.fillRect(startX, centerY - timelineHeight / 2, hourWidth, timelineHeight);
      }
    }
  }

  /**
   * シンプルな背景の描画（時間帯の区別なし）
   */
  private drawSimpleBackground(
    ctx: CanvasRenderingContext2D,
    centerY: number,
    totalWidth: number,
    hourWidth: number,
    timelineHeight: number
  ): void {
    // 時間帯を3つ描画（循環表示のために前後を含む）
    for (let offset = -1; offset <= 1; offset++) {
      // シンプルな背景を一括描画
      const width = 24 * hourWidth;
      const startX = this.timelineOffset + offset * totalWidth;

      // 淡いグレーの単一色でシンプルな背景
      ctx.fillStyle = 'rgba(230, 230, 230, 0.6)';

      // 長方形を描画
      ctx.fillRect(startX, centerY - timelineHeight / 2, width, timelineHeight);
    }
  }

  /**
   * 時間ごとのマーカーを描画
   */
  private drawHourMarkers(
    ctx: CanvasRenderingContext2D,
    padding: number,
    centerY: number,
    totalWidth: number
  ): void {
    const timelineHeight = TIME_SELECTOR_CONSTANTS.TIMELINE_HEIGHT;
    const hourMarkerHeight = TIME_SELECTOR_CONSTANTS.HOUR_MARKER_HEIGHT;
    const hourWidth = TIME_SELECTOR_CONSTANTS.HOUR_WIDTH;

    // 3周期分の時間マーカーを描画（循環表示のため）
    for (let cycle = -1; cycle <= 1; cycle++) {
      for (let hour = 0; hour <= 23; hour++) {
        // 時間区間の中央に配置するために hourWidth/2 を加算
        const x = this.timelineOffset + hour * hourWidth + hourWidth / 2 + cycle * totalWidth;

        // キャンバス内に見えない部分はスキップ
        if (x < -hourWidth || x > ctx.canvas.width + hourWidth) continue;

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
  }

  /**
   * 中央固定のマーカーを描画
   */
  private drawFixedCenterMarker(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number
  ): void {
    const markerRadius = TIME_SELECTOR_CONSTANTS.MARKER_RADIUS; // そのまま使用

    // ドラッグ中は一時選択時間を使用、そうでなければ実際の選択時間を使用
    const displayHour =
      this.isDragging && this.tempSelectedHour !== null
        ? this.tempSelectedHour
        : this.selectedHour();

    // シンプルな円形マーカー
    ctx.beginPath();
    ctx.arc(centerX, centerY, markerRadius, 0, Math.PI * 2);
    ctx.fillStyle = TIME_SELECTOR_CONSTANTS.MARKER_COLOR;
    ctx.fill();

    // 境界線を追加
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 中央マーカーの選択時間テキスト表示
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(displayHour.toString(), centerX, centerY);

    // シンプルな下部マーカー（小さいドット）
    ctx.beginPath();
    ctx.arc(centerX, centerY + markerRadius + 6, 3, 0, Math.PI * 2);
    ctx.fillStyle = TIME_SELECTOR_CONSTANTS.MARKER_COLOR;
    ctx.fill();
  }
}
