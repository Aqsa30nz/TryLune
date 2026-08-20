import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { AiBadge } from "../components/AiBadge";
import { Link } from "react-router-dom";

const SORTS = [
  { key: "ai", label: "AI Match" },
  { key: "rating", label: "Top Rated" },
  { key: "price_asc", label: "Price ↑" },
  { key: "price_desc", label: "Price ↓" },
];

export default function Discover() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("ai");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/categories").then(({ data }) => setCats(["All", ...data.categories]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (cat !== "All") params.category = cat;
    params.sort = sort;
    const t = setTimeout(() => {
      api.get("/products", { params }).then(({ data }) => {
        setProducts(data.products);
        setLoading(false);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q, cat, sort]);

  const hero = useMemo(() => products[0], [products]);
  const rest = products.slice(1);

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
        <div>
          <p className="font-mono-vn text-[11px] uppercase tracking-widest text-[#0033FF] mb-3">
            AI Recommendation Feed
          </p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[0.95]">
            Discover, styled<br />just for you.
          </h1>
        </div>
        <div className="w-full lg:w-96">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525252]" />
            <input
              data-testid="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search fashion, furniture, décor…"
              className="w-full bg-white border border-[#E5E5E5] pl-10 pr-3 py-3 text-sm outline-none focus:border-[#0033FF] focus:ring-1 focus:ring-[#0033FF]"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-8 border-y border-[#E5E5E5] py-4">
        <div className="flex flex-wrap items-center gap-2">
          {cats.map((c) => (
            <button
              key={c}
              data-testid={`filter-${c.toLowerCase()}`}
              onClick={() => setCat(c)}
              className={`px-3.5 py-1.5 text-sm border transition-colors ${
                cat === c
                  ? "bg-[#121212] text-white border-[#121212]"
                  : "bg-transparent border-[#E5E5E5] text-[#525252] hover:border-[#121212] hover:text-[#121212]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <SlidersHorizontal size={15} className="text-[#525252]" />
          {SORTS.map((s) => (
            <button
              key={s.key}
              data-testid={`sort-${s.key}`}
              onClick={() => setSort(s.key)}
              className={`font-mono-vn text-[11px] uppercase tracking-widest px-2 py-1 transition-colors ${
                sort === s.key ? "text-[#0033FF]" : "text-[#525252] hover:text-[#121212]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center font-mono-vn text-sm text-[#525252] vn-blink">
          Ranking products by AI match…
        </div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center text-[#525252]" data-testid="empty-results">
          No products match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8" data-testid="discover-grid">
          {/* Hero feature */}
          {hero && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="md:col-span-8"
            >
              <div className="relative bg-white border border-[#E5E5E5] group h-full flex flex-col">
                <Link to={`/product/${hero.id}`} className="block relative overflow-hidden">
                  <div className="aspect-[16/11] overflow-hidden">
                    <img
                      src={hero.image}
                      alt={hero.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute top-4 left-4"><AiBadge score={hero.ai_match_score} /></div>
                </Link>
                <div className="p-6 flex items-end justify-between gap-4">
                  <div>
                    <span className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
                      Top pick · {hero.category}
                    </span>
                    <h2 className="font-display text-3xl tracking-tight mt-1">{hero.name}</h2>
                    <p className="text-sm text-[#525252] mt-1 max-w-md line-clamp-2">{hero.style_match}</p>
                  </div>
                  <Link
                    to={`/product/${hero.id}`}
                    className="shrink-0 bg-[#121212] text-white px-5 py-2.5 text-sm hover:bg-[#0033FF] transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Secondary stacked */}
          <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-6 lg:gap-8">
            {rest.slice(0, 2).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * (i + 1) }}
              >
                <ProductCard product={p} />
              </motion.div>
            ))}
          </div>

          {/* Rest of grid */}
          {rest.slice(2).map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.03 * i }}
              className="md:col-span-4"
            >
              <ProductCard product={p} className="h-full" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
