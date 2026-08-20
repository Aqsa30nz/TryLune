export function AiBadge({ score, className = "", small = false }) {
  return (
    <span
      data-testid="ai-match-badge"
      className={`inline-flex items-center gap-1.5 font-mono-vn uppercase tracking-widest bg-[#0033FF] text-white ${
        small ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      } ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-white rounded-full vn-blink" />
      AI {score}%
    </span>
  );
}
