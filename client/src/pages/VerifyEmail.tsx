import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import Button from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { authService } from "../services/auth.service";
import { Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Verification request on mount
  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    const performVerification = async () => {
      try {
        await authService.verifyEmail(token);
        setStatus("success");
      } catch (err) {
        console.error("Verification failed:", err);
        setStatus("error");
      }
    };

    performVerification();
  }, [token]);

  // Resend cooldown timer logic
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || cooldown > 0) return;

    setResending(true);
    setResendMessage("");
    setResendError("");

    try {
      const response = await authService.resendVerification(email);
      setResendMessage(response.message || "If an eligible account exists, a verification email has been sent.");
      setCooldown(60);
    } catch (err: any) {
      console.error(err);
      let errMsg = "Failed to resend verification email. Please try again.";
      if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      setResendError(errMsg);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title={
          status === "verifying"
            ? "Verifying..."
            : status === "success"
            ? "Account Active"
            : "Verification Failed"
        }
        subtitle={
          status === "verifying"
            ? "Please wait while we confirm your email"
            : status === "success"
            ? "Your email has been verified"
            : "The verification link is invalid or expired"
        }
      >
        {status === "verifying" && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Verifying your email…
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6 text-center">
            <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
              Email verified successfully! Your account is now active. You can sign in and start exploring Champ.ai.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => navigate("/login")}
                className="w-full"
              >
                Continue to Sign In
              </Button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <p className="text-sm text-slate-650 dark:text-slate-350 text-center leading-relaxed">
              This verification link is invalid or has expired. Enter your email below to request a new link.
            </p>

            {resendMessage && (
              <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {resendMessage}
              </div>
            )}

            {resendError && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                {resendError}
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-4">
              <Input
                type="email"
                placeholder="e.g., muthu@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={resending}
                required
                className="placeholder:text-slate-400/70 dark:placeholder:text-slate-500/70"
              />
              <Button
                type="submit"
                disabled={!email.trim() || cooldown > 0 || resending}
                className="w-full"
              >
                {resending ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin inline" />
                    Sending link...
                  </>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  "Send a new verification email"
                )}
              </Button>
            </form>

            <div className="text-center text-sm pt-2">
              <Link to="/login" className="text-blue-500 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
