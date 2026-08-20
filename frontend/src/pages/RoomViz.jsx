import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShoppingBag, Sofa } from "lucide-react";
import api, { formatPrice } from "../lib/api";
import UploadCapture from "../components/UploadCapture";
import ValidationPanel from "../components/ValidationPanel";
import ProcessingOverlay from "../components/ProcessingOverlay";
import { AiBadge } from "../components/AiBadge";
import { useStore } from "../context/StoreContext";

export default function RoomViz() {
  const [params] = useSearchParams();
  const { addToCart } = useStore();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [image, setImage] = useState(null);
  const [demoFail, setDemoFail] = useState(false);
  const [step, setStep] = useState("upload");
  const [validation, setValidation] = useState(null);
  const [gen, setGen] = useState(null);

  useEffect(() => {
    api.get("/products").then(({ data }) => {
      const g = data.products.filter((p) => p.room_enabled);
      setItems(g);
      const pid = params.get("product");
      setSelected(g.find((x) => x.id === pid) || g[0]);
    });
  }, []);

  const reset = () => {
    setImage(null);
    setValidation(null);
    setGen(null);
    setStep("upload");
  };

  const runValidate = async () => {
    const { data } = await api.post("/visualize/validate", { mode: "room", force_fail: demoFail });
    setValidation(data);
    if (data.valid) {
      const res = await api.post("/visualize/generate", { mode: "room", product_id: selected.id });
      setGen(res.data);
      setStep("processing");
      setTimeout(() => setStep("result"), res.data.duration_ms);
    } else {
      setStep("validated");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <p className="font-mono-vn text-[11px] uppercase tracking-widest text-[#0033FF] mb-3 flex items-center gap-2">
          <Sofa size={13} /> Room Visualization Studio
        </p>
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight leading-none">See it in your space.</h1>
        <p className="text-sm text-[#525252] mt-2 max-w-xl">
          Upload or capture your room, pass validation, then stage the piece in a photoreal composite.
        </p>
      </div>

      <div className="grid lg:grid-cols-[300px_1fr] gap-8">
        <aside>
          <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252] mb-3">
            Select piece
          </p>
          <div className="space-y-2" data-testid="furniture-list">
            {items.map((g) => (
              <button
                key={g.id}
                data-testid={`furniture-${g.id}`}
                onClick={() => { setSelected(g); if (step === "result") reset(); }}
                className={`w-full flex items-center gap-3 p-2 border text-left transition-colors ${
                  selected?.id === g.id ? "border-[#0033FF] bg-white" : "border-[#E5E5E5] bg-white hover:border-[#121212]"
                }`}
              >
                <img src={g.image} alt={g.name} className="w-16 h-14 object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  <p className="text-xs text-[#525252]">{formatPrice(g.price)}</p>
                </div>
                {selected?.id === g.id && (
                  <span className="w-5 h-5 bg-[#0033FF] text-white flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
                Your room
              </span>
              <label className="flex items-center gap-2 text-xs text-[#525252] cursor-pointer" data-testid="demo-fail-toggle">
                <input
                  type="checkbox"
                  checked={demoFail}
                  onChange={(e) => setDemoFail(e.target.checked)}
                  className="accent-[#E05C3A]"
                />
                Demo: poor photo
              </label>
            </div>

            {step === "processing" ? (
              <ProcessingOverlay image={image} stages={gen.stages} duration={gen.duration_ms} />
            ) : (
              <UploadCapture mode="room" image={image} onImage={(img) => { setImage(img); setStep("upload"); setValidation(null); }} onClear={reset} />
            )}

            {image && step === "upload" && (
              <button
                data-testid="visualize-btn"
                onClick={runValidate}
                className="w-full bg-[#121212] text-white py-3 text-sm font-medium hover:bg-[#0033FF] transition-colors"
              >
                Validate & place {selected?.name}
              </button>
            )}

            {step === "validated" && validation && !validation.valid && (
              <ValidationPanel result={validation} onRetry={() => reset()} />
            )}
          </div>

          <div className="space-y-4">
            <span className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
              Room composite
            </span>
            <AnimatePresence mode="wait">
              {step === "result" && gen ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="border border-[#E5E5E5] bg-white"
                  data-testid="room-result"
                >
                  <div className="relative overflow-hidden">
                    <img src={gen.result_image} alt="room result" className="w-full object-cover" />
                    <div className="absolute top-3 left-3"><AiBadge score={selected.ai_match_score} /></div>
                  </div>
                  <div className="p-4 space-y-3">
                    <p className="font-mono-vn text-[10px] uppercase tracking-widest text-[#525252]">
                      {gen.microcopy}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display text-lg tracking-tight">{selected.name}</p>
                        <p className="text-sm text-[#525252]">{formatPrice(selected.price)}</p>
                      </div>
                      <button
                        data-testid="result-add-cart"
                        onClick={() => addToCart(selected.id, selected.sizes[0], selected.colors[0])}
                        className="bg-[#121212] text-white px-4 py-2.5 text-sm inline-flex items-center gap-2 hover:bg-[#0033FF] transition-colors"
                      >
                        <ShoppingBag size={15} /> Add
                      </button>
                    </div>
                    <Link to={`/product/${selected.id}`} className="block text-center text-sm text-[#0033FF] hover:underline">
                      View product details
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <div className="border border-dashed border-[#c9c9c4] bg-white aspect-[3/2] flex items-center justify-center text-center p-6" data-testid="result-placeholder">
                  <p className="text-sm text-[#525252] max-w-[220px]">
                    {step === "processing"
                      ? "Compositing your room…"
                      : "Your representative room composite will appear here."}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  );
}
