# 🍻 Nomikai — 飲み会日程調整アプリ

みんなの空きから **自動で飲み会が決まる** PWA。
名前を入れるだけで参加でき、カレンダーに空きを登録すると、空きが重なった瞬間にアプリが飲み会を提案してくれます。

## 主な機能

- **名前だけで参加** — アカウント登録不要。URLを共有して名前を入れるだけ（調整さん方式）
- **カレンダーで空き登録** — 日付 × 時間帯（早め18:00〜 / 遅め20:00〜）をタップでトグル
- **ハイブリッド自動開催エンジン**
  - 🤖 **自動検出**: 設定人数以上の空きが重なった日を見つけると自動で提案を生成
  - 🎲 **ランダム提案**: 予定が何もない状態が続くと、週1回ペースで「運命のガチャ提案」が届く（金・土優先）
  - 📣 **幹事提案**: 手動で提案を立てることも可能。成立人数は幹事が毎回自由に設定
- **応募 → 自動成立** — 「🍺 行く！」で応募し、成立人数に達した瞬間に開催確定 🎉（乾杯アニメ＋紙吹雪）
- **プッシュ通知** — 新しい提案・開催決定を Web Push でお知らせ（VAPIDキーは初回起動時に自動生成、設定不要）
- **PWA対応** — スマホのホーム画面に追加してアプリとして使える
- **モチベ要素** — 次の飲み会カウントダウン、通算開催数、楽しいアニメーション

## 起動方法（ローカル）

```bash
npm install
npm run build
npm start
```

http://localhost:3000 を開いて名前を入れれば参加完了。
開発時は `npm run dev`。

環境変数なしで起動すると、データはローカルファイル `data/nomikai.db`（SQLite）に保存されます。

## Vercel + Turso へのデプロイ

DBは [Turso](https://turso.tech)（SQLite互換のクラウドDB、無料枠あり）を使います。

1. **TursoでDBを作る**

   ```bash
   # Turso CLI をインストールしてログイン
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login

   # DB作成と接続情報の取得
   turso db create nomikai
   turso db show nomikai --url        # → TURSO_DATABASE_URL
   turso db tokens create nomikai     # → TURSO_AUTH_TOKEN
   ```

   （CLIを入れたくない場合は https://app.turso.tech のWeb画面からでも作れます）

2. **Vercelにデプロイ**

   Vercelでこのリポジトリをインポートし、環境変数に以下を設定：

   | 変数 | 値 |
   | --- | --- |
   | `TURSO_DATABASE_URL` | `libsql://nomikai-xxxx.turso.io` |
   | `TURSO_AUTH_TOKEN` | 上で作ったトークン |

   テーブルとVAPIDキーは初回アクセス時に自動作成されるので、マイグレーション作業は不要です。

> **プッシュ通知について**: Web Push と Service Worker は HTTPS（または localhost）でのみ動作します。Vercel は HTTPS なのでそのまま動きます。

## 仕組み

- **Next.js 15 (App Router) + React 19 + TypeScript**
- **@libsql/client (Turso)** — SQLite互換のクラウドDB。未設定ならローカルファイルにフォールバック
- **web-push** — VAPID キーを初回起動時に生成して DB に保存
- 自動開催エンジン（`lib/scheduler.ts`）は API アクセスのたびに1tick実行される lazy 方式:
  1. 過去日の未成立提案を期限切れに
  2. 直近35日で成立人数以上の空きが重なった（日付, 時間帯）に自動提案
  3. 直近の予定ゼロ＆前回から7日以上経過でランダム提案を発行
  4. 応募が成立人数に達した提案を開催確定に → プッシュ通知

## API

| Method | Path | 説明 |
| --- | --- | --- |
| GET | `/api/state?name=` | 全状態の取得（スケジューラ1tick付き） |
| POST | `/api/join` | 名前でメンバー登録 |
| POST | `/api/availability` | 空きのトグル |
| POST | `/api/proposals` | 幹事による手動提案 |
| POST | `/api/proposals/:id/attend` | 応募 / 取り消し |
| POST | `/api/push/subscribe` | プッシュ通知の購読 |
| POST | `/api/settings` | 自動提案の成立人数（デフォルト3人） |
