import type { Element } from "../types";

/** 属性アイコン(簡易SVG。公式素材は使用しない) */
export function ElementIcon({ element, size = 18 }: { element: Element; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true };
  switch (element) {
    case "fire":
      return (
        <svg {...common}>
          <path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />
        </svg>
      );
    case "ice":
      return (
        <svg {...common}>
          <path d="M11 2h2v20h-2zM4.2 6.5l1-1.7L21 14.8l-1 1.7zM3.2 14.8L19 5.2l1 1.7L4.2 16.5z" />
        </svg>
      );
    case "electric":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
        </svg>
      );
    case "ether":
      return (
        <svg {...common}>
          <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
        </svg>
      );
    case "auric_ink":
      return (
        <svg {...common}>
          <path d="M12 3c-4 5-7 8-7 12a7 7 0 0 0 14 0c0-4-3-7-7-12zm0 15a3 3 0 0 1-3-3c0-1 .4-2 3-5 2.6 3 3 4 3 5a3 3 0 0 1-3 3z" />
        </svg>
      );
    case "wind":
      return (
        <svg {...common}>
          <path d="M3 8h11a3 3 0 1 0-3-3h2a1 1 0 1 1 1 1H3zm0 5h15a3 3 0 1 1-3 3h2a1 1 0 1 0 1-1H3zm0-3h8v2H3z" />
        </svg>
      );
    case "lumiflux":
      return (
        <svg {...common}>
          <path d="M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2zM5 17l1 2.5L8.5 20 6 21l-1 2.5L4 21l-2.5-1L4 19.5z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M4 4h16v4H4zm0 6h10v4H4zm0 6h16v4H4z" />
        </svg>
      );
  }
}
