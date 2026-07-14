import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

interface GoogleButtonProps {
  onError?: (message: string) => void;
}

export default function GoogleButton({ onError }: GoogleButtonProps) {
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonWidth, setButtonWidth] = useState(340);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const handleResize = () => {
      if (containerRef.current) {
        // Measure parent container width
        const width = containerRef.current.getBoundingClientRect().width;
        // Clamp between 200px and 400px (Google's supported range)
        const clampedWidth = Math.min(400, Math.max(200, Math.floor(width)));
        setButtonWidth(clampedWidth);
      }
    };

    // Run on mount
    handleResize();

    // Small delay to ensure browser layout is stable
    const timer = setTimeout(handleResize, 100);

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  const handleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      if (onError) onError("Google Sign-In was cancelled.");
      return;
    }

    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate("/chat");
    } catch (err: any) {
      // Safe message extraction to satisfy requirements without printing sensitive configs/tokens to logs
      console.error("Google Auth execution completed with error:", err.message || "Failed request");
      
      const responseData = err.response?.data;
      let errMsg = "";
      
      // 1. Check for array validation errors
      if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        errMsg = responseData.errors[0].msg || responseData.errors[0].message || "";
      }
      
      // 2. Check general message in response
      if (!errMsg && responseData?.message) {
        errMsg = responseData.message;
      }
      
      // 3. Fallback
      if (!errMsg) {
        errMsg = "Unable to complete Google sign-in. Please try again.";
      }

      if (onError) onError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full flex justify-center mt-2 relative z-30 min-h-[44px]">
      {loading && (
        <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[1px] rounded-lg z-40 flex items-center justify-center pointer-events-none" />
      )}
      {/* Dynamic re-render via width key keeps the button responsive and layout-stable */}
      <GoogleLogin
        key={buttonWidth}
        onSuccess={handleSuccess}
        onError={() => {
          if (onError) onError("Google sign-in was cancelled.");
        }}
        theme="filled_black" // Sleek dark theme matching Champ.ai
        shape="rectangular"  // Professional rounded rectangle
        size="large"         // 44px height matching other buttons
        width={`${buttonWidth}px`} // Responsive dynamic width
        text="continue_with" // Displays: Continue with Google
      />
    </div>
  );
}
