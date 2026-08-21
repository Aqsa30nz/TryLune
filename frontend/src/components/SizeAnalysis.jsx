import { useState } from "react";
import { Ruler, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";

const FIELDS = [
  ["height", "Height"],
  ["shoulder", "Shoulder"],
  ["chest", "Chest / Bust"],
  ["waist", "Waist"],
  ["hip", "Hip"],
  ["inseam", "Inseam"],
];

export default function SizeAnalysis({ productId, userImage }) {
  const [m, setM] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const measurements = {};
      Object.entries(m).forEach(([k, v]) => { if (v) measurements[k] = Number(v); });
      const { data } = await api.post("/analyze/body", {
        product_id: productId,
        user_image: userImage || null,
        measurements,
      });
      setResult(data);
    } catch (e) {
      toast.error("Body analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-[#E5E5E5] bg-white" data-testid="size-analysis">
      <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center gap-2">
        <Ruler size={15} className="text-[#0033FF]" />
        <span className="font-mono-vn text-[11px] uppercase tracking-widest text-[#525252]">
          Body & Size Analysis
        </span>
        <span className="ml-auto font-mono-vn text-[9px] uppercase tracking-widest text-[#525252] bg-[#f2f2ef] px-1.5 py-0.5">
          AI-estimated
        </span>
      </div>

      <div className="p-5 space-y-4">
        <button
          data-testid="toggle-measurements"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between text-sm text-[#121212]"
        >
          <span>Enter your measurements (optional, in cm)</span>
          <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map(([key, label]) => (
              <div key={key}>
                <label className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">{label}</label>
                <input
                  data-testid={`measure-${key}`}
                  type="number"
                  min="0"
                  value={m[key] || ""}
                  onChange={(e) => setM({ ...m, [key]: e.target.value })}
                  placeholder="cm"
                  className="mt-1 w-full bg-white border border-[#E5E5E5] px-2.5 py-2 text-sm outline-none focus:border-[#0033FF]"
                />
              </div>
            ))}
          </div>
        )}

        <button
          data-testid="analyze-body-btn"
          onClick={analyze}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#121212] text-white py-2.5 text-sm font-medium hover:bg-[#0033FF] transition-colors disabled:opacity-60"
        >
          <Sparkles size={15} />
          {loading ? "Analyzing your body…" : userImage ? "Analyze body & recommend size" : "Recommend my size"}
        </button>

        {result && (
          <div className="space-y-4 pt-1" data-testid="size-result">
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-[#E5E5E5] p-3 text-center">
                <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">Recommended</p>
                <p className="font-display text-3xl text-[#0033FF]" data-testid="recommended-size">{result.recommended_size}</p>
              </div>
              <div className="border border-[#E5E5E5] p-3 text-center">
                <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">Fit</p>
                <p className="font-display text-xl mt-1.5" data-testid="recommended-fit">{result.fit}</p>
              </div>
              <div className="border border-[#E5E5E5] p-3 text-center">
                <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">Confidence</p>
                <p className="font-mono-vn text-xl mt-1.5" data-testid="confidence">{result.confidence}%</p>
              </div>
            </div>

            <div className="h-1.5 bg-[#eee]">
              <div className="h-full bg-[#0033FF]" style={{ width: `${result.confidence}%` }} />
            </div>

            <div className="flex flex-wrap gap-2">
              {result.measurements.map((mm) => (
                <span
                  key={mm.key}
                  className="inline-flex items-center gap-1.5 border border-[#E5E5E5] px-2 py-1 text-xs"
                >
                  <span className="text-[#525252]">{mm.label}:</span>
                  <span className="font-medium">{mm.value}</span>
                  {mm.estimated && mm.value !== "—" && (
                    <span className="font-mono-vn text-[8px] uppercase tracking-widest text-[#0033FF]">AI est.</span>
                  )}
                </span>
              ))}
            </div>

            <p className="text-xs text-[#525252] leading-relaxed">{result.note}</p>
            <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
