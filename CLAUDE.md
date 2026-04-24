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
1. **go-design-systemのコンポーネント優先** — Button, Card, Badge等は `@takaki/go-design-system` 経由
2. **Server Components優先** — `'use client'` は必要箇所のみ
3. **型安全** — `any` 型は使用しない
4. **AI SDK** — `@anthropic-ai/sdk` のみ使用（openai等は禁止）
5. **MetaGo管理下** — コード品質・依存更新PRはMetaGoが自動作成

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
