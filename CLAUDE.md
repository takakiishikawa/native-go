@AGENTS.md

# native-go — CLAUDE.md

## プロジェクト概要
子育て記録・成長管理アプリ。お子さんの日々を記録し、成長を可視化する。

## 技術スタック
- Framework: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS + go-design-system
- Auth: Supabase Auth（Google OAuth）
- DB: Supabase
- Deploy: Vercel

## 開発コマンド
```bash
npm install       # 依存関係インストール
npm run dev       # 開発サーバー (localhost:3000)
npm run build     # 本番ビルド
npm run lint      # ESLint
```

## 重要なルール
1. **`@takaki/go-design-system` を最優先** — UIコンポーネントだけでなくレイアウト・ページテンプレート・トークン・ユーティリティ・Hooks すべて DS から取る（詳細は次セクション）
2. **Server Components優先** — `'use client'` は必要箇所のみ
3. **型安全** — `any` 型は使用しない
4. **AI SDK** — `@anthropic-ai/sdk` のみ使用（openai等は禁止）
5. **MetaGo管理下** — コード品質・依存更新PRはMetaGoが自動作成

## go-design-system の使い方

### エントリで必須の import
```tsx
// app/layout.tsx か app/globals.css 経由で
import "@takaki/go-design-system/tokens.css"
import "@takaki/go-design-system/globals.css"
```

### 提供される要素（直importせず DS から取る）
- **UIコンポーネント**: Button, Card, Badge, Dialog, Sheet, Tabs, Sidebar, DataTable, Calendar, Chart 等（shadcn/ui 準拠）
- **レイアウト**: `AppLayout`, `PageHeader`
- **ページテンプレート**: `DashboardPage`, `LoginPage`, `ConceptPage`, `SettingsPage`, `AppSidebar` / `AppSwitcher` / `UserMenu`（sidebar-01）
- **Feedback**: `Banner`, `EmptyState`, `Spinner`, `Toaster` + `toast()`
- **Form 補助**: `FormActions`, `DatePicker`
- **ユーティリティ**: `cn()`（`clsx` + `tailwind-merge` を抽象化。Layer 1 の直 import 代替）
- **Hooks**: `useIsMobile()`

### 設計指針
- ページ単位（ダッシュボード／ログイン／設定／コンセプト等）は **まず DS のテンプレートで作れないか確認** してから自前実装する
- ボタン色や spacing は `tokens.css` の CSS 変数（`--color-primary`, `--spacing-*` 等）で上書き。コンポーネント内 hardcode は避ける
- Layer 1 の Radix UI / sonner / next-themes / clsx 等は **DS 経由のラッパー** で使う（直 import は禁止）

## パッケージ規則
| Layer | 内容 |
|-------|------|
| Foundation | next, react, typescript, tailwindcss, `@takaki/go-design-system` |
| Layer 1 (DS吸収) | Radix UI等は直接importしない（DS経由で使う） |
| Layer 2 (全go共通) | `@supabase/*`, zod, date-fns, react-hook-form, `@vercel/analytics` |
| Layer 3 (機能) | `@dnd-kit/*`, react-dropzone 等（機能に応じて） |
| Layer 4 (固有) | このプロダクト専用ライブラリのみ |
| 禁止 | openai, ai, `@ai-sdk/*` |

## MetaGo連携
MetaGoがこのリポジトリを中央管理しています。
- **L1（自動マージ）**: ESLint修正、Prettier、未使用import、デザインシステム違反修正、patch/minor依存更新
- **L2（承認待ち）**: major依存更新のみ
