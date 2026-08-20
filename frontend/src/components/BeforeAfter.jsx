import { useRef, useState, useCallback, useEffect } from "react";
import { MoveHorizontal } from "lucide-react";

export default function BeforeAfter({ before, after }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);

  const move = useCallback((clientX) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      move(e.touches ? e.touches[0].clientX : e.clientX);
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, [move]);

  return (
    <div
      ref={ref}
      data-testid="before-after"
      className="relative select-none overflow-hidden bg-black"
      onMouseDown={(e) => { dragging.current = true; move(e.clientX); }}
      onTouchStart={(e) => { dragging.current = true; move(e.touches[0].clientX); }}
    >
      {/* After (base layer) */}
      <img src={after} alt="after" className="block w-full object-cover pointer-events-none" draggable={false} />
      <span className="absolute top-3 right-3 font-mono-vn text-[10px] uppercase tracking-widest bg-[#0033FF] text-white px-2 py-0.5">
        After
      </span>

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt="before"
          className="block h-full w-auto max-w-none object-cover"
          style={{ width: ref.current ? ref.current.getBoundingClientRect().width : "100%" }}
          draggable={false}
        />
        <span className="absolute top-3 left-3 font-mono-vn text-[10px] uppercase tracking-widest bg-[#121212] text-white px-2 py-0.5">
          Before
        </span>
      </div>

      {/* Handle */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg">
          <MoveHorizontal size={16} className="text-[#121212]" />
        </div>
      </div>
    </div>
  );
}
