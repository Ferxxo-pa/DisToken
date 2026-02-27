import { useEffect, useRef, useState } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchStart?: (distance: number) => void;
  onPinchChange?: (distance: number, delta: number) => void;
  onPinchEnd?: () => void;
  onTap?: (x: number, y: number) => void;
  swipeThreshold?: number;
  element?: HTMLElement | null;
}

function getTouchDistance(t1: React.Touch | Touch, t2: React.Touch | Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function useTouchGestures(options: TouchGestureOptions) {
  const {
    onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown,
    onPinchStart, onPinchChange, onPinchEnd,
    onTap,
    swipeThreshold = 50,
    element,
  } = options;

  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const initialPinchDistance = useRef(0);
  const isPinching = useRef(false);
  const hasMoved = useRef(false);

  useEffect(() => {
    const el = element || document.documentElement;

    const handleTouchStart = (e: TouchEvent) => {
      hasMoved.current = false;
      if (e.touches.length === 1) {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        startTime.current = Date.now();
        isPinching.current = false;
      } else if (e.touches.length === 2) {
        isPinching.current = true;
        initialPinchDistance.current = getTouchDistance(e.touches[0], e.touches[1]);
        onPinchStart?.(initialPinchDistance.current);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && isPinching.current) {
        const dist = getTouchDistance(e.touches[0], e.touches[1]);
        onPinchChange?.(dist, dist - initialPinchDistance.current);
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - startX.current);
        const dy = Math.abs(e.touches[0].clientY - startY.current);
        if (dx > 10 || dy > 10) hasMoved.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isPinching.current) {
        isPinching.current = false;
        onPinchEnd?.();
        return;
      }

      if (e.changedTouches.length !== 1) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX.current;
      const dy = endY - startY.current;
      const elapsed = Date.now() - startTime.current;

      // Tap detection: < 300ms, < 10px movement
      if (!hasMoved.current && elapsed < 300) {
        onTap?.(endX, endY);
        return;
      }

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > swipeThreshold && absDx > absDy) {
        if (dx < 0) onSwipeLeft?.();
        else onSwipeRight?.();
      } else if (absDy > swipeThreshold && absDy > absDx) {
        if (dy < 0) onSwipeUp?.();
        else onSwipeDown?.();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onPinchStart, onPinchChange, onPinchEnd, onTap, swipeThreshold]);
}

/** Detect if user is primarily on touch device */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsTouch(window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    };
    check();
    const mq = window.matchMedia('(pointer: coarse)');
    mq.addEventListener('change', check);
    return () => mq.removeEventListener('change', check);
  }, []);

  return isTouch;
}
