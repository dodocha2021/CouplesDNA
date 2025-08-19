import { useRef, useState, useCallback, useEffect } from 'react';

// Auto-scroll hook for chat interfaces and scrollable content
export function useAutoScroll(options = {}) {
  const { offset = 20, smooth = false, content } = options;
  const scrollRef = useRef(null);
  const lastContentHeight = useRef(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);

  const checkIsAtBottom = useCallback(
    (element) => {
      const { scrollTop, scrollHeight, clientHeight } = element;
      const distanceToBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
      return distanceToBottom <= offset;
    },
    [offset]
  );

  const scrollToBottom = useCallback(
    (instant) => {
      if (!scrollRef.current) return;

      const targetScrollTop = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;

      if (instant) {
        scrollRef.current.scrollTop = targetScrollTop;
      } else {
        scrollRef.current.scrollTo({
          top: targetScrollTop,
          behavior: smooth ? "smooth" : "auto",
        });
      }

      setIsAtBottom(true);
      setAutoScrollEnabled(true);
    },
    [smooth]
  );

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const atBottom = checkIsAtBottom(scrollRef.current);
    setIsAtBottom(atBottom);
    if (atBottom) setAutoScrollEnabled(true);
  }, [checkIsAtBottom]);

  const disableAutoScroll = useCallback(() => {
    const atBottom = scrollRef.current ? checkIsAtBottom(scrollRef.current) : false;
    if (!atBottom) {
      setAutoScrollEnabled(false);
    }
  }, [checkIsAtBottom]);

  // Add scroll listener
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Auto-scroll when content changes
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const currentHeight = scrollElement.scrollHeight;
    const hasNewContent = currentHeight !== lastContentHeight.current;

    if (hasNewContent && autoScrollEnabled) {
      requestAnimationFrame(() => {
        scrollToBottom(lastContentHeight.current === 0);
      });
      lastContentHeight.current = currentHeight;
    }
  }, [content, autoScrollEnabled, scrollToBottom]);

  return {
    scrollRef,
    isAtBottom,
    autoScrollEnabled,
    scrollToBottom: () => scrollToBottom(false),
    disableAutoScroll,
  };
}