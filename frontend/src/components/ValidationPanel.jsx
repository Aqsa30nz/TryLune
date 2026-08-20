import { Check, X, AlertTriangle } from "lucide-react";

export default function ValidationPanel({ result, onRetry }) {
  if (!result) return null;
  const { valid, checks, guidance } = result;

  return (
    <div
      data-testid="validation-panel"
      className={`border bg-white ${valid ? "border-[#E5E5E5]" : "border-[#E05C3A]"}`}
    >
      <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center gap-2">
        <span className="font-mono-vn text-[11px] uppercase tracking-widest text-[#525252]">
          Input Validation
        </span>
        <span
          data-testid="validation-status"
          className={`ml-auto font-mono-vn text-[11px] uppercase tracking-widest px-2 py-0.5 ${
            valid ? "bg-[#0033FF] text-white" : "bg-[#E05C3A] text-white"
          }`}
        >
          {valid ? "Passed" : "Blocked"}
        </span>
      </div>
      <ul className="p-5 space-y-2.5">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-3 text-sm" data-testid={`check-${c.key}`}>
            <span
              className={`w-5 h-5 flex items-center justify-center ${
                c.passed ? "bg-[#121212] text-white" : "bg-[#E05C3A] text-white"
              }`}
            >
              {c.passed ? <Check size={12} /> : <X size={12} />}
            </span>
            <span className={c.passed ? "text-[#121212]" : "text-[#525252]"}>{c.label}</span>
          </li>
        ))}
      </ul>
      {!valid && (
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-start gap-2 text-sm text-[#525252] bg-[#faf3f1] border border-[#f0d5cd] p-3">
            <AlertTriangle size={16} className="text-[#E05C3A] shrink-0 mt-0.5" />
            <span>{guidance}</span>
          </div>
          <div className="flex gap-3">
            <button
              data-testid="retake-btn"
              onClick={() => onRetry(true)}
              className="border border-[#121212] px-4 py-2 text-sm hover:bg-[#121212] hover:text-white transition-colors"
            >
              Retake
            </button>
            <button
              data-testid="upload-another-btn"
              onClick={() => onRetry(false)}
              className="bg-[#121212] text-white px-4 py-2 text-sm hover:bg-[#0033FF] transition-colors"
            >
              Upload another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
