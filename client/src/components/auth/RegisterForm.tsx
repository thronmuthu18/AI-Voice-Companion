import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "../ui/Input";
import Button from "../ui/Button";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate, Link } from "react-router-dom";
import GoogleButton from "./GoogleButton";

export default function RegisterForm() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showPassword, setShowPassword] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const isMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const toggleTooltip = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowTooltip((prev) => !prev);
  };

  const handleKeyDownTooltip = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setShowTooltip((prev) => !prev);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }

    const isValidPassword = isMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    if (!isValidPassword) {
      setError("Please complete all password requirements.");
      return;
    }

    try {
      // Register the user
      await register({
        name,
        email,
        password,
      });

      navigate("/verify-email-sent", { state: { email } });
    } catch (err: any) {
      const responseData = err.response?.data;
      let errMsg = "";

      // 1. Check if backend returns validation errors array
      if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        errMsg = responseData.errors[0].msg || responseData.errors[0].message || "";
      }

      // 2. Check for general message in response
      if (!errMsg && responseData?.message) {
        errMsg = responseData.message;
      }

      // 3. Fallback to general err.message if no response data
      if (!errMsg && err.message) {
        errMsg = err.message;
      }

      // 4. Fallback default
      if (!errMsg) {
        errMsg = "Registration failed. Please try again.";
      }

      // If email is already registered/exists
      if (
        errMsg.toLowerCase().includes("user already exists") ||
        errMsg.toLowerCase().includes("email already registered") ||
        errMsg.toLowerCase().includes("email already exists")
      ) {
        errMsg = "An account with this email already exists. Please sign in or use another email.";
      }

      setError(errMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      <Input
        type="text"
        placeholder="e.g., muthu "
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
        className="placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70"
      />

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
          className="pr-20 placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70"
        />

        <div className="absolute right-3 top-2 flex items-center gap-1 z-20">
          {/* Info Button with Tooltip */}
          <div className="relative">
            <button
              type="button"
              aria-label="Password complexity requirements info"
              onClick={toggleTooltip}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              onKeyDown={handleKeyDownTooltip}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-blue-500 hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-slate-100/10 dark:hover:bg-slate-800/30 text-sm font-bold transition duration-200 select-none cursor-pointer"
            >
              ⓘ
            </button>

            {showTooltip && (
              <div
                role="tooltip"
                className="absolute bottom-full right-0 mb-2 w-64 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 bg-slate-900/95 dark:bg-slate-950/95 text-slate-800 dark:text-slate-100 backdrop-blur-md shadow-2xl space-y-2 pointer-events-auto text-left"
              >
                <p className="font-semibold text-slate-850 dark:text-slate-200 text-xs">Password must contain:</p>
                <div className="space-y-1 text-slate-600 dark:text-slate-350 text-[11px]">
                  <p>• At least 8 characters</p>
                  <p>• At least one uppercase letter (A–Z)</p>
                  <p>• At least one lowercase letter (a–z)</p>
                  <p>• At least one number (0–9)</p>
                  <p>• At least one special character (e.g., @, #, $, !)</p>
                </div>
                <div className="pt-1.5 border-t border-slate-200/30 dark:border-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400">
                  Example: <span className="font-mono text-blue-600 dark:text-blue-400">Muthu@123</span>
                </div>
              </div>
            )}
          </div>

          {/* Show/Hide Password Button */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-450 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition duration-200"
            disabled={isLoading}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Password requirements live checklist */}
      <div className="mt-2 space-y-1 text-xs text-slate-400 dark:text-slate-500 pl-1">
        <div className={`flex items-center gap-1.5 transition-colors duration-200 ${isMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          <span>{isMinLength ? "✓" : "○"}</span>
          <span>At least 8 characters</span>
        </div>
        <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasUppercase ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          <span>{hasUppercase ? "✓" : "○"}</span>
          <span>One uppercase letter</span>
        </div>
        <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasLowercase ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          <span>{hasLowercase ? "✓" : "○"}</span>
          <span>One lowercase letter</span>
        </div>
        <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasNumber ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          <span>{hasNumber ? "✓" : "○"}</span>
          <span>One number</span>
        </div>
        <div className={`flex items-center gap-1.5 transition-colors duration-200 ${hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}>
          <span>{hasSpecial ? "✓" : "○"}</span>
          <span>One special character</span>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 size={18} className="mr-2 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Sign Up"
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

      {/* Continue with Google Button */}
      <GoogleButton onError={setError} />

      <div className="text-center text-sm text-slate-400 mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
}
