import { Ruler, Check, AlertTriangle } from "lucide-react";

export default function RoomAnalysis({ analysis }) {
  if (!analysis) return null;
  const { room_dimensions_ft: room, clear_space_ft: clear, furniture_dimensions_ft: fur,
    fits, coverage_pct, verdict, notes, disclaimer } = analysis;

  return (
    <div className="border border-[#E5E5E5] bg-white" data-testid="room-analysis">
      <div className="px-5 py-3 border-b border-[#E5E5E5] flex items-center gap-2">
        <Ruler size={15} className="text-[#0033FF]" />
        <span className="font-mono-vn text-[11px] uppercase tracking-widest text-[#525252]">
          Room & Space Analysis
        </span>
        <span
          data-testid="fit-badge"
          className={`ml-auto inline-flex items-center gap-1.5 font-mono-vn text-[10px] uppercase tracking-widest px-2 py-0.5 text-white ${
            fits ? "bg-[#0033FF]" : "bg-[#E05C3A]"
          }`}
        >
          {fits ? <Check size={11} /> : <AlertTriangle size={11} />}
          {fits ? "Fits" : "Tight"}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-[#E5E5E5] p-3">
            <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">Room</p>
            <p className="text-sm font-medium mt-1" data-testid="room-dims">{room.width} × {room.length} ft</p>
          </div>
          <div className="border border-[#E5E5E5] p-3">
            <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">Clear space</p>
            <p className="text-sm font-medium mt-1">{clear.width} × {clear.depth} ft</p>
          </div>
          <div className="border border-[#E5E5E5] p-3">
            <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">This piece</p>
            <p className="text-sm font-medium mt-1" data-testid="furniture-dims">{fur.width} × {fur.depth} ft</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-[#525252]">Floor coverage</span>
            <span className="font-mono-vn">{coverage_pct}%</span>
          </div>
          <div className="h-1.5 bg-[#eee]">
            <div className={`h-full ${fits ? "bg-[#0033FF]" : "bg-[#E05C3A]"}`} style={{ width: `${Math.min(100, coverage_pct)}%` }} />
          </div>
        </div>

        <p className="text-sm text-[#121212]" data-testid="room-verdict">{verdict}</p>
        {notes && <p className="text-xs text-[#525252] leading-relaxed">{notes}</p>}
        <p className="font-mono-vn text-[9px] uppercase tracking-widest text-[#525252]">{disclaimer}</p>
      </div>
    </div>
  );
}
