export {};

declare global {
  interface Window {
    /** Provided by https://lepide-design-system.vercel.app/v1/lepidus.js */
    Lepidus?: {
      init: (root?: ParentNode) => void;
      initDropdown: (el: Element) => void;
    };
  }
}
