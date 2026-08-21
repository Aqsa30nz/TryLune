import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { ShoppingBag, Heart, GitCompareArrows, LogOut, Sparkles } from "lucide-react";

const links = [
  { to: "/", label: "Discover" },
  { to: "/try-on", label: "Try-On" },
  { to: "/room", label: "Room Studio" },
  { to: "/compare", label: "Compare" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount, wishlist } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-[#F9F9F6]/90 backdrop-blur-md border-b border-[#E5E5E5]">
      <nav className="max-w-[1400px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link
          to="/"
          data-testid="nav-logo"
          className="flex items-center gap-2 group"
        >
          <span className="w-7 h-7 bg-[#121212] text-white flex items-center justify-center group-hover:bg-[#0033FF] transition-colors">
            <Sparkles size={15} />
          </span>
          <span className="font-display text-xl tracking-tight">TryLune</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                data-testid={`nav-${l.label.toLowerCase().replace(/\s/g, "-")}`}
                className={`text-sm tracking-wide transition-colors hover:text-[#0033FF] ${
                  active ? "text-[#121212] font-semibold" : "text-[#525252]"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/compare"
            data-testid="nav-compare-icon"
            className="hidden sm:block text-[#525252] hover:text-[#0033FF] transition-colors"
            title="Compare"
          >
            <GitCompareArrows size={19} />
          </Link>
          <Link
            to="/wishlist"
            data-testid="nav-wishlist"
            className="relative text-[#525252] hover:text-[#0033FF] transition-colors"
            title="Wishlist"
          >
            <Heart size={19} />
            {wishlist.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#E05C3A] text-white text-[10px] font-mono-vn w-4 h-4 flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </Link>
          <Link
            to="/cart"
            data-testid="nav-cart"
            className="relative text-[#525252] hover:text-[#0033FF] transition-colors"
            title="Cart"
          >
            <ShoppingBag size={19} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-[#0033FF] text-white text-[10px] font-mono-vn w-4 h-4 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          {user && (
            <button
              data-testid="nav-logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="text-[#525252] hover:text-[#E05C3A] transition-colors"
              title="Log out"
            >
              <LogOut size={19} />
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
