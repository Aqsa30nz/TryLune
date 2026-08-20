import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { formatPrice } from "../lib/api";
import { useStore } from "../context/StoreContext";

export default function Cart() {
  const { cart, updateCart, removeCart } = useStore();

  const subtotal = cart.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shipping = subtotal > 0 ? 0 : 0;
  const total = subtotal + shipping;

  if (cart.length === 0)
    return (
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-24 text-center" data-testid="empty-cart">
        <ShoppingBag size={28} className="mx-auto text-[#525252] mb-4" />
        <h1 className="font-display text-3xl tracking-tight">Your cart is empty</h1>
        <p className="text-sm text-[#525252] mt-2">Discover something you love.</p>
        <Link to="/" className="inline-block mt-6 bg-[#121212] text-white px-6 py-3 text-sm hover:bg-[#0033FF] transition-colors">
          Browse products
        </Link>
      </div>
    );

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
      <p className="font-mono-vn text-[11px] uppercase tracking-widest text-[#0033FF] mb-3">Decide</p>
      <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none mb-8">Your bag.</h1>

      <div className="grid lg:grid-cols-[1fr_340px] gap-8">
        <div className="border border-[#E5E5E5] bg-white divide-y divide-[#E5E5E5]" data-testid="cart-items">
          {cart.map((item) => (
            <div key={item.id} className="flex gap-4 p-4" data-testid={`cart-item-${item.product.id}`}>
              <Link to={`/product/${item.product.id}`} className="shrink-0 overflow-hidden">
                <img src={item.product.image} alt={item.product.name} className="w-24 h-28 object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link to={`/product/${item.product.id}`} className="font-display text-lg tracking-tight hover:text-[#0033FF] transition-colors">
                      {item.product.name}
                    </Link>
                    <p className="text-xs text-[#525252] mt-0.5">
                      {[item.color, item.size].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <button
                    data-testid={`cart-remove-${item.product.id}`}
                    onClick={() => removeCart(item.id)}
                    className="text-[#525252] hover:text-[#E05C3A] transition-colors h-fit"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center border border-[#E5E5E5]">
                    <button
                      data-testid={`cart-dec-${item.product.id}`}
                      onClick={() => updateCart(item.id, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#f2f2ef] transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-8 text-center text-sm font-mono-vn">{item.qty}</span>
                    <button
                      data-testid={`cart-inc-${item.product.id}`}
                      onClick={() => updateCart(item.id, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#f2f2ef] transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="font-semibold">{formatPrice(item.product.price * item.qty)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="border border-[#E5E5E5] bg-white p-6 h-fit lg:sticky lg:top-24" data-testid="cart-summary">
          <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] mb-4">Order Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#525252]">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-[#525252]">Shipping</span><span>Free</span></div>
          </div>
          <div className="border-t border-[#E5E5E5] mt-4 pt-4 flex justify-between items-baseline">
            <span className="font-medium">Total</span>
            <span className="text-2xl font-semibold" data-testid="cart-total">{formatPrice(total)}</span>
          </div>
          <button
            data-testid="checkout-btn"
            onClick={() => alert("This is a prototype — no real payment is processed.")}
            className="w-full bg-[#121212] text-white py-3.5 text-sm font-medium mt-6 hover:bg-[#0033FF] transition-colors"
          >
            Checkout
          </button>
          <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] mt-3 text-center">
            Prototype · no real payment
          </p>
        </aside>
      </div>
    </div>
  );
}
