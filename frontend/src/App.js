import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Discover from "./pages/Discover";
import ProductDetails from "./pages/ProductDetails";
import TryOn from "./pages/TryOn";
import RoomViz from "./pages/RoomViz";
import Compare from "./pages/Compare";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[#E5E5E5] mt-24">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg tracking-tight">VirtueNova</p>
            <p className="text-sm text-[#525252]">AI shopping — Virtual Try-On & Room Visualization.</p>
          </div>
          <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] max-w-sm sm:text-right">
            Try-On applies a real AI photo edit to your uploaded image. Room views use representative visualizations. Live GPU inference available via the same FastAPI endpoint.
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <StoreProvider>
          <BrowserRouter>
            <Toaster position="top-center" />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Shell><Discover /></Shell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/product/:id"
                element={
                  <ProtectedRoute>
                    <Shell><ProductDetails /></Shell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/try-on"
                element={
                  <ProtectedRoute>
                    <Shell><TryOn /></Shell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room"
                element={
                  <ProtectedRoute>
                    <Shell><RoomViz /></Shell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compare"
                element={
                  <ProtectedRoute>
                    <Shell><Compare /></Shell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Shell><Cart /></Shell>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <Shell><Wishlist /></Shell>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </StoreProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
