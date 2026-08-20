import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart([]);
      setWishlist([]);
      return;
    }
    try {
      const [c, w] = await Promise.all([api.get("/cart"), api.get("/wishlist")]);
      setCart(c.data.items);
      setWishlist(w.data.items);
    } catch (e) {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addToCart = async (product_id, size, color, qty = 1) => {
    const { data } = await api.post("/cart", { product_id, size, color, qty });
    setCart(data.items);
    toast.success("Added to cart");
  };

  const updateCart = async (item_id, qty) => {
    const { data } = await api.patch(`/cart/${item_id}?qty=${qty}`);
    setCart(data.items);
  };

  const removeCart = async (item_id) => {
    const { data } = await api.delete(`/cart/${item_id}`);
    setCart(data.items);
  };

  const inWishlist = (product_id) =>
    wishlist.some((w) => w.product.id === product_id);

  const toggleWishlist = async (product_id) => {
    if (inWishlist(product_id)) {
      const { data } = await api.delete(`/wishlist/${product_id}`);
      setWishlist(data.items);
      toast("Removed from wishlist");
    } else {
      const { data } = await api.post("/wishlist", { product_id });
      setWishlist(data.items);
      toast.success("Saved to wishlist");
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        cartCount,
        addToCart,
        updateCart,
        removeCart,
        inWishlist,
        toggleWishlist,
        refresh,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
