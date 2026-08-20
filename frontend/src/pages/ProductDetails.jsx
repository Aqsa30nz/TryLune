import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, Heart, Shirt, Sofa, ArrowLeft, Cpu } from "lucide-react";
import api, { formatPrice } from "../lib/api";
import { AiBadge } from "../components/AiBadge";
import { useStore } from "../context/StoreContext";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "../components/ui/sheet";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, inWishlist } = useStore();
  const [p, setP] = useState(null);
  const [assess, setAssess] = useState(null);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    setP(null);
    api.get(`/products/${id}`).then(({ data }) => {
      setP(data);
      setColor(data.colors?.[0] || "");
      setSize(data.sizes?.[0] || "");
    });
  }, [id]);

  const loadAssess = () => {
    if (!assess) api.get(`/assess/${id}`).then(({ data }) => setAssess(data));
  };

  if (!p)
    return (
      <div className="py-32 text-center font-mono-vn text-sm text-[#525252] vn-blink">
        Loading product…
      </div>
    );

  const saved = inWishlist(p.id);

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-6">
      <button
        onClick={() => navigate(-1)}
        data-testid="back-btn"
        className="inline-flex items-center gap-2 text-sm text-[#525252] hover:text-[#121212] mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
        {/* Sticky image */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative bg-white border border-[#E5E5E5] overflow-hidden">
            <img src={p.image} alt={p.name} className="w-full object-cover" data-testid="product-image" />
            <div className="absolute top-4 left-4"><AiBadge score={p.ai_match_score} /></div>
          </div>
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-xl"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono-vn text-[11px] uppercase tracking-widest text-[#525252]">
              {p.category}
            </span>
            <span className="flex items-center gap-1 text-sm text-[#525252]">
              <Star size={13} className="fill-[#121212] text-[#121212]" /> {p.rating}
              <span className="text-[#a3a3a3]">· {p.reviews} reviews</span>
            </span>
          </div>

          <h1 data-testid="product-name" className="font-display text-4xl sm:text-5xl tracking-tight mt-2 leading-none">
            {p.name}
          </h1>
          <p className="text-2xl font-semibold mt-4" data-testid="product-price">{formatPrice(p.price)}</p>
          <p className="text-[15px] text-[#525252] leading-relaxed mt-4">{p.description}</p>

          {/* Colors */}
          <div className="mt-8">
            <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] mb-2">Colour</p>
            <div className="flex flex-wrap gap-2">
              {p.colors.map((c) => (
                <button
                  key={c}
                  data-testid={`color-${c}`}
                  onClick={() => setColor(c)}
                  className={`px-3 py-1.5 text-sm border transition-colors ${
                    color === c ? "bg-[#121212] text-white border-[#121212]" : "border-[#E5E5E5] hover:border-[#121212]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Sizes */}
          <div className="mt-6">
            <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] mb-2">
              {p.category === "Fashion" ? "Size" : "Configuration"}
            </p>
            <div className="flex flex-wrap gap-2">
              {p.sizes.map((s) => (
                <button
                  key={s}
                  data-testid={`size-${s}`}
                  onClick={() => setSize(s)}
                  className={`min-w-[3rem] px-3 py-1.5 text-sm border transition-colors ${
                    size === s ? "bg-[#121212] text-white border-[#121212]" : "border-[#E5E5E5] hover:border-[#121212]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              data-testid="add-to-cart-btn"
              onClick={() => addToCart(p.id, size, color)}
              className="flex-1 min-w-[10rem] bg-[#121212] text-white py-3.5 text-sm font-medium hover:bg-[#0033FF] transition-colors"
            >
              Add to cart
            </button>
            <button
              data-testid="details-wishlist-btn"
              onClick={() => toggleWishlist(p.id)}
              className={`px-4 py-3.5 border transition-colors ${
                saved ? "bg-[#E05C3A] border-[#E05C3A] text-white" : "border-[#121212] hover:bg-[#121212] hover:text-white"
              }`}
            >
              <Heart size={17} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Visualize CTA */}
          {(p.tryon_enabled || p.room_enabled) && (
            <Link
              to={p.tryon_enabled ? `/try-on?product=${p.id}` : `/room?product=${p.id}`}
              data-testid="visualize-cta"
              className="mt-3 flex items-center justify-center gap-2 border border-[#0033FF] text-[#0033FF] py-3.5 text-sm font-medium hover:bg-[#0033FF] hover:text-white transition-colors"
            >
              {p.tryon_enabled ? <Shirt size={16} /> : <Sofa size={16} />}
              {p.tryon_enabled ? "Try it on virtually" : "Visualize in your room"}
            </Link>
          )}

          {/* Assess */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                data-testid="assess-btn"
                onClick={loadAssess}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-white border border-[#E5E5E5] py-3.5 text-sm hover:border-[#121212] transition-colors"
              >
                <Cpu size={16} className="text-[#0033FF]" /> Assess fit & style match
              </button>
            </SheetTrigger>
            <SheetContent data-testid="assess-panel" className="bg-white border-l border-[#E5E5E5] w-full sm:max-w-md overflow-y-auto rounded-none">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-tight text-left">
                  Style Assessment
                </SheetTitle>
                <SheetDescription className="text-left text-sm text-[#525252]">
                  AI-derived fit and style match for this product.
                </SheetDescription>
              </SheetHeader>
              {assess ? (
                <div className="mt-6 space-y-6">
                  <div className="flex items-center gap-4 border border-[#E5E5E5] p-4">
                    <div className="font-mono-vn text-4xl text-[#0033FF]">{assess.ai_match_score}%</div>
                    <div>
                      <p className="font-medium">{assess.recommendation}</p>
                      <p className="text-sm text-[#525252]">{assess.fit_note}</p>
                    </div>
                  </div>
                  <p className="text-[15px] text-[#525252] leading-relaxed">{assess.summary}</p>
                  <div className="space-y-3">
                    {assess.factors.map((f) => (
                      <div key={f.label} data-testid={`factor-${f.label}`}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{f.label}</span>
                          <span className="font-mono-vn text-[#525252]">{f.value}%</span>
                        </div>
                        <div className="h-1.5 bg-[#eee]">
                          <div className="h-full bg-[#121212]" style={{ width: `${f.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] pt-2 border-t border-[#E5E5E5]">
                    Scores computed from your browsing signals & catalog metadata.
                  </p>
                </div>
              ) : (
                <p className="mt-8 font-mono-vn text-sm text-[#525252] vn-blink">Analyzing…</p>
              )}
            </SheetContent>
          </Sheet>

          {/* Specs */}
          <div className="mt-10 border-t border-[#E5E5E5]">
            <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] mt-6 mb-3">
              Specifications
            </p>
            <dl className="divide-y divide-[#E5E5E5] border border-[#E5E5E5]">
              {Object.entries(p.specs).map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                  <dt className="text-[#525252]">{k}</dt>
                  <dd className="font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
