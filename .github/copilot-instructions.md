# Jam Checker - 交通量表示アプリケーション開発指示書

このドキュメントは、Jam Checkerアプリケーション開発におけるGitHub Copilotへの指示を含んでいます。このプロジェクトでは、時間帯別の交通量をマップ上に視覚的に表示する機能を提供します。詳細な情報は全てmemory-bankディレクトリ内のファイルに記録されています。

## タスク開始手順

各タスクを開始する際は、必ず以下の手順に従ってください：

1. **メモリーバンクの読み込み**: `/memory-bank/memory-bank.md`およびその関連ファイルを読み込み、プロジェクトの現状と進捗を理解する
2. **要件の確認**: このドキュメントと最新のプロジェクト要件を確認する
3. **タスクの実行**: メモリーバンクの情報に基づいて、適切な実装を行う
4. **ドキュメントの更新**: 必要に応じてメモリーバンクの情報を更新する

## プロジェクト概要

- **名前**: Jam Checker
- **目的**: 異なる時間帯の交通混雑状況をマップ上に視覚的に表示し、ユーザーが効率的な移動計画を立てられるよう支援する
- **使用技術**: Angular 19, TypeScript, RxJS, HTML, Tailwind CSS
- **パッケージ管理**: yarn
- **コード品質管理**: ESLint, Prettier
- **プロジェクト管理**: GitHub

詳細な情報は以下のファイルを参照してください：
- プロジェクトの詳細要件：`/memory-bank/project-brief.md`
- 製品コンテキスト：`/memory-bank/product-context.md`
- システムパターン：`/memory-bank/system-patterns.md`
- 技術コンテキスト：`/memory-bank/tech-context.md`
- 現在の状況：`/memory-bank/active-context.md`
- 進捗状況：`/memory-bank/progress.md`

## コーディング規約

- **TypeScript**: 最新の機能と型定義を最大限に活用
- **コンポーネント命名**: PascalCase (例: `HogeFugaComponent`)
- **サービス命名**: PascalCase + 'Service' (例: `HogeDataService`)
- **インターフェース命名**: PascalCase + 'I' プレフィックス (例: `IHogeData`)
- **ファイル命名**: kebab-case (例: `hoge-fuga.component.ts`)
- **CSS クラス命名**: Tailwind CSSのユーティリティクラスを利用したアプローチを採用
- **非同期処理**: Signalを基本とし、必要に応じてRxJSを補助的に使用
- **コメント**: JSDocスタイルのコメントを推奨
- **パッケージのインストール**: yarnを使用（例: `yarn add package-name`、`yarn add -D package-name`）

## コード品質

- **ESLint**: プロジェクト定義のルールに従う
- **Prettier**: コードフォーマットの自動適用
- **テスト**: Jasmine/Karma を使用した単体テスト
- **カバレッジ**: 最低80%のコードカバレッジを目標

## プロジェクト構造

```
src/
|-- app/
|   |-- core/                          # コアモジュール
|   |   |-- guards/                    # ルートガード
|   |   |-- interceptors/              # HTTPインターセプター
|   |   |-- directives/                # 共通ディレクティブ
|   |   |-- pipes/                     # 共通パイプ
|   |
|   |-- store/                         # グローバル状態管理
|   |   |-- hoge.store.ts              # hoge関連の状態
|   |
|   |-- components/                    # 共有コンポーネント
|   |   |-- ui/                        # 再利用可能なUIコンポーネント
|   |   |   |-- button/                # ボタンコンポーネント
|   |   |   |-- card/                  # カードコンポーネント
|   |   |   |-- loading/               # ローディングインジケーター
|   |   |
|   |   |-- layout/                    # レイアウトコンポーネント
|   |       |-- header/                # ヘッダーコンポーネント
|   |       |-- footer/                # フッターコンポーネント
|   |       |-- sidebar/               # サイドバーコンポーネント
|   |
|   |-- features/                      # 機能モジュール
|   |   |-- hoge-fuga/                 # hoge-fuga機能
|   |   |   |-- components/            # 機能固有のUIコンポーネント
|   |   |   |   |-- presentational/    # Presentationalコンポーネント
|   |   |   |   |   |-- fuga-view/     # fugaビューコンポーネント
|   |   |   |   |   |-- piyo-selector/ # piyo選択コンポーネント
|   |   |   |   |
|   |   |   |   |-- container/         # Containerコンポーネント
|   |   |   |       |-- hoge-fuga/     # hoge-fugaコンポーネント
|   |   |   |
|   |   |   |-- services/              # 機能固有のサービス
|   |   |   |-- models/                # 機能固有のモデル
|   |
|   |-- models/                        # データモデル/インターフェース
|   |   |-- hoge.model.ts              # hogeデータモデル
|   |
|   |-- services/                      # グローバルサービス
|   |   |-- hoge.service.ts       # hogeデータサービス
|   |
|   |-- utils/                         # ユーティリティ関数
|       |-- date-formatter.util.ts     # 日付フォーマット
|       |-- common-utils.ts            # 共通ユーティリティ
|
|-- public/                            # 静的アセット
|   |-- images/                        # 画像ファイル
|   |-- icons/                         # アイコン
|   |-- data/                          # データファイル
```
