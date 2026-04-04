# NativeGo Design System

## 概要

NativeGoは、社会人向け英語リピーティング学習アプリです。
「落ち着いた・知的・信頼感」を軸に、LinearのモダンさとBacklogの使いやすさを参考に設計します。

---

## ブランドトーン

| 軸 | 方向性 |
|---|---|
| 印象 | 落ち着いた・知的・信頼感 |
| 対象 | 社会人・Native Camp利用者 |
| UX原則 | 1画面1目的・シンプル・実用的 |
| 複雑さ | 保守拡張性を優先。装飾・アニメーションは最小限 |

---

## カラーパレット

### プライマリカラー（青系）
```css
--color-primary-50:  #EFF6FF;
--color-primary-100: #DBEAFE;
--color-primary-200: #BFDBFE;
--color-primary-400: #60A5FA;
--color-primary-600: #2563EB;
--color-primary-700: #1D4ED8;
--color-primary-900: #1E3A8A;
```

### ニュートラル
```css
--color-neutral-50:  #F8FAFC;
--color-neutral-100: #F1F5F9;
--color-neutral-200: #E2E8F0;
--color-neutral-400: #94A3B8;
--color-neutral-600: #475569;
--color-neutral-800: #1E293B;
--color-neutral-900: #0F172A;
```

### セマンティックカラー
```css
--color-success:        #10B981;
--color-success-bg:     #ECFDF5;
--color-warning:        #F59E0B;
--color-warning-bg:     #FFFBEB;
--color-neutral-tag:    #64748B;
--color-neutral-tag-bg: #F1F5F9;
--color-error:          #EF4444;
--color-error-bg:       #FEF2F2;
```

### ダークモード
```css
--color-dark-bg:           #0F172A;
--color-dark-surface:      #1E293B;
--color-dark-border:       #334155;
--color-dark-text:         #E2E8F0;
--color-dark-subtext:      #94A3B8;
--color-dark-primary:      #3B82F6;
--color-dark-primary-hover:#2563EB;
```

---

## タイポグラフィ
```css
font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
```

| 用途 | サイズ | Weight |
|---|---|---|
| ページタイトル | 24px | 600 |
| セクション見出し | 18px | 600 |
| カードタイトル | 16px | 500 |
| 本文 | 14px | 400 |
| サブテキスト | 12px | 400 |
| リピーティング本文 | 28〜32px | 500 |
| リピーティングサブ | 18px | 400 |

---

## スペーシング
```css
--space-1:  4px;  --space-2:  8px;  --space-3:  12px;
--space-4:  16px; --space-5:  20px; --space-6:  24px;
--space-8:  32px; --space-10: 40px; --space-12: 48px;
```

---

## ボーダー・角丸・シャドウ
```css
--radius-sm:   4px;
--radius-md:   8px;
--radius-lg:   12px;
--radius-full: 9999px;
--border-default: 1px solid var(--color-neutral-200);
--border-focus:   2px solid var(--color-primary-600);
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 4px 6px rgba(0,0,0,0.07);
--shadow-lg:  0 10px 15px rgba(0,0,0,0.08);
```

---

## コンポーネント設計

### サイドバー
- 幅: 220px固定
- 背景: --color-neutral-100（ライト）/ --color-dark-surface（ダーク）
- アクティブ項目: bg --color-primary-50、text --color-primary-700、左ボーダー 3px solid --color-primary-600

### ボタン
- Primary: bg --color-primary-600、text white、hover --color-primary-700
- Secondary: bg white、border --border-default、text --color-neutral-800
- 高さ: 36px / 角丸: --radius-md

### テーブル
- ヘッダー: bg --color-neutral-50、text --color-neutral-600、12px 500、sticky top:0
- 行hover: bg --color-neutral-50
- セルパディング: 12px 16px

### バッジ（ステータス）
- 未登録: bg --color-neutral-tag-bg、text --color-neutral-tag
- 練習中: bg --color-warning-bg、text --color-warning
- 習得済み: bg --color-success-bg、text --color-success
- 角丸: --radius-full、パディング: 2px 10px、font-size: 12px

### カード
- 背景: white / --color-dark-surface
- ボーダー: --border-default、角丸: --radius-lg、パディング: --space-6

### モーダル
- オーバーレイ: rgba(0,0,0,0.4)
- 幅: 560px（デフォルト）/ 720px（大）
- 角丸: --radius-lg、パディング: --space-6

---

## リピーティング画面

- 会話テキスト: 28〜32px、行間 1.8
- A:発話: text --color-primary-700
- B:発話: text --color-neutral-600
- 現在行ハイライト: bg --color-primary-50、左ボーダー 3px solid --color-primary-600
- 完了画面: シンプルなメッセージのみ。アニメーション不要
- 途中終了ボタン: テキストリンク形式（目立たせない）

---

## ダークモード

ベトナム時間（Asia/Ho_Chi_Minh）18:00〜翌6:00に自動切替。1時間ごとに再チェック。
```ts
const hour = new Date().toLocaleString('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', hour12: false
});
const isDark = Number(hour) >= 18 || Number(hour) < 6;
document.documentElement.classList.toggle('dark', isDark);
```

---

## レスポンシブ

- 最小対応幅: 1024px
- サイドバー: 固定220px
- メインコンテンツ: flex-1
- コンテンツ最大幅: 1200px

---

## アイコン

- Heroicons（outline）を使用
- サイズ: ナビ20px / インライン16px / 強調24px
- ナビメニュー・アクションボタン・ステータス表示には必ずアイコンを添える

---

## 実装優先事項

1. CSS変数を徹底使用。値のハードコード禁止
2. アニメーション・エフェクトは最小限
3. shadcn/uiをベースにCSS変数でカスタマイズ
