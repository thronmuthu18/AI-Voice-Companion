import { GoogleLogin } from "@react-oauth/google";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface GoogleButtonProps {
  onError?: (message: string) => void;
}

export default function GoogleButton({ onError }: GoogleButtonProps) {
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      if (onError) onError("No credential returned from Google.");
      return;
    }

    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate("/chat");
    } catch (err: any) {
      console.error("Google Auth error:", err);
      let msg = "Google authentication failed. Please try again.";
      if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      if (onError) onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex justify-center mt-2 relative z-30">
      {loading && (
        <div className="absolute inset-0 bg-white/10 dark:bg-black/10 backdrop-blur-[1px] rounded-lg z-40 flex items-center justify-center pointer-events-none" />
      )}
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => {
          if (onError) onError("Google Sign-In failed. Please try again.");
        }}
        theme="filled_blue"
        shape="rectangular"
        size="large"
        width="340px" // Fits nicely inside the form container
        text="continue_with"
      />
    </div>
  );
}
