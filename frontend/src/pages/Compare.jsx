import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, X, Star } from "lucide-react";
import api, { formatPrice } from "../lib/api";
import { AiBadge } from "../components/AiBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";

const ROWS = [
  { key: "price", label: "Price", render: (p) => formatPrice(p.price) },
  { key: "rating", label: "Rating", render: (p) => `${p.rating} ★ (${p.reviews})` },
  { key: "ai_match_score", label: "AI Match Score", render: (p) => `${p.ai_match_score}%`, highlight: true },
  { key: "category", label: "Category", render: (p) => p.category },
  { key: "colors", label: "Colours", render: (p) => p.colors.join(", ") },
  { key: "sizes", label: "Options", render: (p) => p.sizes.join(", ") },
  { key: "visualize", label: "Visualization", render: (p) => (p.tryon_enabled ? "Virtual Try-On" : p.room_enabled ? "Room View" : "—") },
];

export default function Compare() {
  const [all, setAll] = useState([]);
  const [slots, setSlots] = useState([null, null, null]);

  useEffect(() => {
    api.get("/products").then(({ data }) => {
      setAll(data.products);
      setSlots([data.products[0], data.products[6], null]);
    });
  }, []);

  const setSlot = (i, id) => {
    const p = all.find((x) => x.id === id) || null;
    setSlots((s) => s.map((v, idx) => (idx === i ? p : v)));
  };

  const specKeys = Array.from(
    new Set(slots.filter(Boolean).flatMap((p) => Object.keys(p.specs)))
  );

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
      <p className="font-mono-vn text-[11px] uppercase tracking-widest text-[#0033FF] mb-3">Compare</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mb-8">
        Weigh your options.
      </h1>

      <div className="overflow-x-auto border border-[#E5E5E5] bg-white" data-testid="compare-table">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className="w-40 border-b border-r border-[#E5E5E5] bg-[#F9F9F6]" />
              {slots.map((p, i) => (
                <th key={i} className="border-b border-r border-[#E5E5E5] p-4 align-top text-left last:border-r-0">
                  {p ? (
                    <div className="relative">
                      <button
                        data-testid={`remove-slot-${i}`}
                        onClick={() => setSlot(i, null)}
                        className="absolute -top-1 -right-1 w-6 h-6 border border-[#E5E5E5] bg-white flex items-center justify-center hover:border-[#E05C3A] hover:text-[#E05C3A] transition-colors"
                      >
                        <X size={12} />
                      </button>
                      <Link to={`/product/${p.id}`} className="block overflow-hidden mb-3">
                        <img src={p.image} alt={p.name} className="w-full aspect-square object-cover" />
                      </Link>
                      <AiBadge score={p.ai_match_score} small />
                      <p className="font-display text-lg tracking-tight mt-2 leading-tight">{p.name}</p>
                    </div>
                  ) : (
                    <div className="min-h-[220px] flex flex-col items-center justify-center gap-3 border border-dashed border-[#c9c9c4] p-4">
                      <Plus size={20} className="text-[#525252]" />
                      <Select value="" onValueChange={(v) => setSlot(i, v)}>
                        <SelectTrigger data-testid={`add-slot-${i}`} className="rounded-none border-[#E5E5E5] text-sm">
                          <SelectValue placeholder="Add product" />
                        </SelectTrigger>
                        <SelectContent className="rounded-none">
                          {all.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="rounded-none">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.key}>
                <td className="border-b border-r border-[#E5E5E5] bg-[#F9F9F6] px-4 py-3 text-sm font-medium text-[#525252]">
                  {r.label}
                </td>
                {slots.map((p, i) => (
                  <td
                    key={i}
                    className={`border-b border-r border-[#E5E5E5] px-4 py-3 text-sm last:border-r-0 ${
                      r.highlight ? "text-[#0033FF] font-mono-vn font-medium" : ""
                    }`}
                  >
                    {p ? r.render(p) : "—"}
                  </td>
                ))}
              </tr>
            ))}
            {specKeys.map((k) => (
              <tr key={k}>
                <td className="border-b border-r border-[#E5E5E5] bg-[#F9F9F6] px-4 py-3 text-sm font-medium text-[#525252]">
                  {k}
                </td>
                {slots.map((p, i) => (
                  <td key={i} className="border-b border-r border-[#E5E5E5] px-4 py-3 text-sm last:border-r-0">
                    {p?.specs?.[k] || "—"}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="border-r border-[#E5E5E5] bg-[#F9F9F6] px-4 py-3" />
              {slots.map((p, i) => (
                <td key={i} className="border-r border-[#E5E5E5] px-4 py-3 last:border-r-0">
                  {p && (
                    <Link
                      to={`/product/${p.id}`}
                      className="inline-block bg-[#121212] text-white px-4 py-2 text-sm hover:bg-[#0033FF] transition-colors"
                    >
                      View
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
