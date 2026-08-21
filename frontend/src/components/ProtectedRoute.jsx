import { useAuth } from "../context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono-vn text-sm text-[#525252] vn-blink">
          Loading TryLune…
        </span>
      </div>
    );

  if (!user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return children;
}
