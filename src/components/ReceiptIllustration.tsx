// Lightweight 3D illustration (CSS 3D, no WebGL) for the receipt scan tiles:
// a floating receipt + a stack of coins (sales) or a cardboard box (purchases).
// Styles live in index.css (.illus-*). Animation stops automatically when the user chooses reduced motion.

export default function ReceiptIllustration({ kind, dark = false }: { kind: "sale" | "purchase"; dark?: boolean }) {
  return (
    <div className={`illus-3d ${dark ? "illus-dark" : ""}`} aria-hidden>
      <div className="illus-spin">
        {/* receipt paper */}
        <div className="illus-receipt">
          <div className="illus-receipt-header" />
          <div className="illus-row" style={{ width: "78%" }} />
          <div className="illus-row" style={{ width: "62%" }} />
          <div className="illus-row" style={{ width: "70%" }} />
          <div className="illus-row" style={{ width: "54%" }} />
          <div className="illus-receipt-total">
            <span />
            <span />
          </div>
        </div>

        {kind === "sale" ? (
          // stack of coins: stacked layers give a sense of thickness
          <div className="illus-coin">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} style={{ transform: `translateY(${-i * 5}px)` }} />
            ))}
            <b>Rp</b>
          </div>
        ) : (
          // 3D cardboard box (cube)
          <div className="illus-box">
            <span className="front" />
            <span className="back" />
            <span className="right" />
            <span className="left" />
            <span className="top" />
            <span className="bottom" />
          </div>
        )}
      </div>
      <div className="illus-shadow" />
    </div>
  );
}
