import type { HTMLAttributes } from "react";
import { createPortal } from "react-dom";

// Lapisan layar penuh (popup, laci, overlay) yang dirender langsung ke <body>.
// Elemen ber-transform/filter (animasi halaman, kartu miring) membuat posisi
// `fixed` terkunci pada elemen itu, sehingga popup tidak berada di tengah layar.
export default function Lapisan(props: HTMLAttributes<HTMLDivElement>) {
  return createPortal(<div {...props} />, document.body);
}
