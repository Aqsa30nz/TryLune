import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";

export default function Wishlist() {
  const { wishlist } = useStore();

  if (wishlist.length === 0)
    return (
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-24 text-center" data-testid="empty-wishlist">
        <Heart size={28} className="mx-auto text-[#525252] mb-4" />
        <h1 className="font-display text-3xl tracking-tight">Your wishlist is empty</h1>
        <p className="text-sm text-[#525252] mt-2">Tap the heart on any product to save it here.</p>
        <Link to="/" className="inline-block mt-6 bg-[#121212] text-white px-6 py-3 text-sm hover:bg-[#0033FF] transition-colors">
          Browse products
        </Link>
      </div>
    );

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
      <p className="font-mono-vn text-[11px] uppercase tracking-widest text-[#0033FF] mb-3">Saved</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mb-8">Your wishlist.</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8" data-testid="wishlist-grid">
        {wishlist.map((w) => (
          <ProductCard key={w.product.id} product={w.product} className="h-full" />
        ))}
      </div>
    </div>
  );
}
