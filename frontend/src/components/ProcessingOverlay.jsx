import { useEffect, useState } from "react";

export default function ProcessingOverlay({ image, stages, duration = 3000 }) {
  const [idx, setIdx] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const per = duration / stages.length;
    const stageTimer = setInterval(() => {
      setIdx((i) => (i < stages.length - 1 ? i + 1 : i));
    }, per);
    const start = Date.now();
    const pctTimer = setInterval(() => {
      const p = Math.min(99, Math.round(((Date.now() - start) / duration) * 100));
      setPct(p);
    }, 60);
    return () => {
      clearInterval(stageTimer);
      clearInterval(pctTimer);
    };
  }, [duration, stages.length]);

  return (
    <div className="relative border border-[#0033FF] bg-white" data-testid="processing-overlay">
      <div className="relative overflow-hidden">
        <img src={image} alt="processing" className="w-full max-h-[520px] object-cover" />
        <div className="absolute inset-0 bg-[#0033FF]/5" />
        <div className="vn-scan-line" style={{ top: 0 }} />
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-8 pointer-events-none opacity-30">
          {Array.from({ length: 48 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-[#0033FF]/40" />
          ))}
        </div>
      </div>
      <div className="p-5 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono-vn text-[12px] text-[#0033FF]" data-testid="processing-stage">
            {stages[idx]}
          </span>
          <span className="font-mono-vn text-[12px] text-[#525252]">{pct}%</span>
        </div>
        <div className="h-1 bg-[#eee]">
          <div
            className="h-full bg-[#0033FF] transition-[width] duration-75"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
          AI-generated representative visualization
        </p>
      </div>
    </div>
  );
}
