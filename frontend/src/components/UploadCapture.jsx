import { useRef, useState, useEffect } from "react";
import { Upload, Camera, RefreshCw, X } from "lucide-react";

export default function UploadCapture({ mode, image, onImage, onClear }) {
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 50);
    } catch (e) {
      setError("Camera unavailable. Please upload a photo instead.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    onImage(canvas.toDataURL("image/jpeg", 0.9));
    stopCamera();
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImage(reader.result);
    reader.readAsDataURL(file);
  };

  if (image) {
    return (
      <div className="relative border border-[#E5E5E5] bg-white" data-testid="upload-preview">
        <img src={image} alt="upload" className="w-full h-full object-cover max-h-[520px]" />
        <button
          data-testid="clear-image-btn"
          onClick={() => { onClear(); }}
          className="absolute top-3 right-3 w-8 h-8 bg-white border border-[#E5E5E5] flex items-center justify-center hover:border-[#E05C3A] hover:text-[#E05C3A] transition-colors"
          title="Upload another"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="border border-dashed border-[#c9c9c4] bg-white" data-testid="upload-zone">
      {cameraOn ? (
        <div className="relative">
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[520px] object-cover bg-black" />
          <div className="absolute inset-x-0 bottom-0 p-4 flex items-center justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent">
            <button
              data-testid="capture-photo-btn"
              onClick={capture}
              className="bg-white text-[#121212] px-5 py-2.5 text-sm font-medium hover:bg-[#0033FF] hover:text-white transition-colors"
            >
              Capture
            </button>
            <button
              onClick={stopCamera}
              className="border border-white text-white px-4 py-2.5 text-sm hover:bg-white hover:text-[#121212] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-10 sm:p-14 flex flex-col items-center text-center gap-5">
          <div className="w-14 h-14 border border-[#E5E5E5] flex items-center justify-center text-[#0033FF]">
            <Upload size={22} />
          </div>
          <div>
            <p className="font-display text-xl tracking-tight">
              {mode === "tryon" ? "Upload a full-body photo" : "Upload a photo of your room"}
            </p>
            <p className="text-sm text-[#525252] mt-1">
              {mode === "tryon"
                ? "Stand facing the camera in even lighting."
                : "Capture from a corner so the floor and two walls are visible."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              data-testid="choose-file-btn"
              onClick={() => fileRef.current?.click()}
              className="bg-[#121212] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#0033FF] transition-colors inline-flex items-center gap-2"
            >
              <Upload size={15} /> Upload photo
            </button>
            <button
              data-testid="open-camera-btn"
              onClick={startCamera}
              className="border border-[#121212] px-5 py-2.5 text-sm font-medium hover:bg-[#121212] hover:text-white transition-colors inline-flex items-center gap-2"
            >
              <Camera size={15} /> Use camera
            </button>
          </div>
          {error && <p className="text-sm text-[#E05C3A]" data-testid="camera-error">{error}</p>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>
      )}
    </div>
  );
}
