"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GuardArgs = {
  /** ガードを有効にする条件（リピーティング進行中など） */
  active: boolean;
  /** 完走済みアイテムの DB 書き込み Promise を貯めている ref */
  pendingPromisesRef: React.MutableRefObject<Promise<unknown>[]>;
  /** 「はい」（途中終了）が選択されたタイミングで呼ばれる（任意） */
  onFinalize?: () => void;
};

/**
 * リピーティング中のページからの離脱を検知して、確認モーダルを挟むためのフック。
 *
 * - サイドバー等の内部リンククリック: capture-phase で `<a>` クリックを横取り
 * - ブラウザの戻る/リロード/タブ閉じ: `beforeunload` で標準警告
 *
 * 「はい」が選ばれたら pendingPromisesRef を await してから navigate する。
 */
export function useRepeatingSessionGuard({
  active,
  pendingPromisesRef,
  onFinalize,
}: GuardArgs) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  // ガード自体が「はい」処理中に false に切り替わらないよう、active を最新参照に
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // 内部リンククリックの横取り
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (!activeRef.current) return;
      // 修飾キー付きクリックや右クリックはネイティブ動作（新タブ等）を尊重
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // 外部リンク、ハッシュ、特殊スキームは無視（外部は beforeunload で警告される）
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }
      // 同一パスは何もしない
      if (href === window.location.pathname) return;
      // 内部リンクのみ横取り
      if (!href.startsWith("/")) return;

      e.preventDefault();
      e.stopImmediatePropagation();
      setPendingHref(href);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [active]);

  // タブ閉じ・リロード等
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      // 一部ブラウザは returnValue を文字列に設定すると標準ダイアログを表示
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);

  const confirmLeave = useCallback(async () => {
    const href = pendingHref;
    setPendingHref(null);
    // ここまでに走らせた increment を全部待つ
    if (pendingPromisesRef.current.length > 0) {
      await Promise.allSettled(pendingPromisesRef.current);
      pendingPromisesRef.current = [];
    }
    onFinalize?.();
    if (href) {
      router.push(href);
    }
  }, [pendingHref, pendingPromisesRef, router, onFinalize]);

  const cancelLeave = useCallback(() => {
    setPendingHref(null);
  }, []);

  return {
    pendingHref,
    confirmLeave,
    cancelLeave,
  };
}
