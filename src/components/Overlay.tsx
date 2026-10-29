import type { HTMLAttributes } from "react";
import { createPortal } from "react-dom";

// Full-screen layer (popup, drawer, overlay) rendered directly into <body>.
// Transformed/filtered elements (page animations, tilted cards) lock `fixed`
// positioning to that element, so the popup would not be centered on screen.
export default function Overlay(props: HTMLAttributes<HTMLDivElement>) {
  return createPortal(<div {...props} />, document.body);
}
