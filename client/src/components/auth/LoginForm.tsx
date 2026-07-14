import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "../ui/Input";
import Button from "../ui/Button";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate, Link } from "react-router-dom";
import GoogleButton from "./GoogleButton";
import { authService } from "../../services/auth.service";

export default function LoginForm() {
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnverified, setIsUnverified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  // Cooldown countdown timer logic
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsUnverified(false);
    setResendMessage("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    try {
      await login({
        email,
        password,
      });
      navigate("/chat");
    } catch (err: any) {
      console.error(err);
      const responseData = err.response?.data;
      
      if (responseData?.code === "EMAIL_NOT_VERIFIED") {
        setIsUnverified(true);
        setError("Your email address has not been verified. Check your inbox and verify your email before signing in.");
      } else {
        setError(responseData?.message || "Invalid email or password");
      }
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email.trim()) return;
    setResending(true);
    setResendMessage("");
    setError("");

    try {
      const response = await authService.resendVerification(email);
      setResendMessage(response.message || "If an eligible account exists, a verification email has been sent.");
      setCooldown(60); // 60 seconds cooldown timer
    } catch (err: any) {
      console.error(err);
      let errMsg = "Failed to resend verification email. Please try again.";
      if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      setError(errMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
          <p>{error}</p>
          {isUnverified && (
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="mt-2 text-xs font-semibold text-blue-500 hover:text-blue-400 disabled:text-slate-500 focus:outline-none transition"
            >
              {resending ? (
                "Resending email..."
              ) : cooldown > 0 ? (
                `Resend email in ${cooldown}s`
              ) : (
                "Resend verification email"
              )}
            </button>
          )}
        </div>
      )}

      {resendMessage && (
        <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {resendMessage}
        </div>
      )}

      <Input
        type="email"
        placeholder="e.g., muthu@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        className="placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70"
      />

      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="e.g., Muthu@123"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="pr-10 placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-3 text-slate-400"
          disabled={isLoading}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 size={18} className="mr-2 animate-spin inline" />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </Button>

      {/* Divider */}
      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-slate-200/20 dark:border-slate-800/40"></div>
        <span className="flex-shrink mx-4 text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
          OR
        </span>
        <div className="flex-grow border-t border-slate-200/20 dark:border-slate-800/40"></div>
      </div>

      {/* Google Sign In */}
      <GoogleButton onError={setError} />

      <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
        Don't have an account?{" "}
        <Link to="/register" className="text-blue-500 hover:underline">
          Sign Up
        </Link>
      </div>
    </form>
  );
}