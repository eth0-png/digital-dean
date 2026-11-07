"use client";

import { useEffect } from "react";

/**
 * Кольцо фокуса нужно тем, кто ходит по сайту клавиатурой. После касания или щелчка оно лишнее,
 * но браузер иногда считает фокус «клавиатурным» (например, вкладки Radix переводят фокус сами).
 * Запоминаем последний способ ввода в <html data-input>, а globals.css прячет кольцо при pointer.
 */
export function InputModality() {
  useEffect(() => {
    const root = document.documentElement;
    const pointer = () => (root.dataset.input = "pointer");
    const keyboard = (e: KeyboardEvent) => {
      if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ") root.dataset.input = "keyboard";
    };
    window.addEventListener("pointerdown", pointer, true);
    window.addEventListener("keydown", keyboard, true);
    return () => {
      window.removeEventListener("pointerdown", pointer, true);
      window.removeEventListener("keydown", keyboard, true);
    };
  }, []);
  return null;
}
