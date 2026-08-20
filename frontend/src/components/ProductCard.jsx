import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { AiBadge } from "./AiBadge";
import { formatPrice } from "../lib/api";
import { useStore } from "../context/StoreContext";

export default function ProductCard({ product, className = "", featured = false }) {
  const { inWishlist, toggleWishlist } = useStore();
  const saved = inWishlist(product.id);

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`group relative bg-white border border-[#E5E5E5] flex flex-col ${className}`}
    >
      <Link to={`/product/${product.id}`} className="block relative overflow-hidden">
        <div className={`overflow-hidden ${featured ? "aspect-[4/5] md:aspect-[16/10]" : "aspect-[4/5]"}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </div>
        <div className="absolute top-3 left-3">
          <AiBadge score={product.ai_match_score} small />
        </div>
      </Link>

      <button
        data-testid={`wishlist-toggle-${product.id}`}
        onClick={() => toggleWishlist(product.id)}
        className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center border transition-colors ${
          saved
            ? "bg-[#E05C3A] border-[#E05C3A] text-white"
            : "bg-white/90 border-[#E5E5E5] text-[#121212] hover:border-[#121212]"
        }`}
        title="Wishlist"
      >
        <Heart size={15} fill={saved ? "currentColor" : "none"} />
      </button>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-center justify-between">
          <span className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
            {product.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-[#525252]">
            <Star size={11} className="fill-[#121212] text-[#121212]" />
            {product.rating}
          </span>
        </div>
        <Link to={`/product/${product.id}`}>
          <h3 className={`font-display tracking-tight leading-snug hover:text-[#0033FF] transition-colors ${featured ? "text-2xl" : "text-lg"}`}>
            {product.name}
          </h3>
        </Link>
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-base font-semibold">{formatPrice(product.price)}</span>
          {(product.tryon_enabled || product.room_enabled) && (
            <span className="font-mono-vn text-[10px] uppercase tracking-widest text-[#0033FF]">
              {product.tryon_enabled ? "Try-On" : "Room View"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
