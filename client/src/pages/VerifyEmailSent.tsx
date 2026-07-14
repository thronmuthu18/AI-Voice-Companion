import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import Button from "../components/ui/Button";
import { authService } from "../services/auth.service";
import { Loader2 } from "lucide-react";

export default function VerifyEmailSent() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "";

  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Cooldown countdown timer logic
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setMessage("");
    setError("");

    try {
      const response = await authService.resendVerification(email);
      setMessage(response.message || "If an eligible account exists, a verification email has been sent.");
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
    <AuthLayout>
      <AuthCard
        title="Check your email"
        subtitle="Verify your email to activate your Champ.ai account"
      >
        <div className="space-y-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
            We sent a verification link to{" "}
            {email ? (
              <strong className="text-blue-500 font-semibold">{email}</strong>
            ) : (
              "your email address"
            )}
            . Open the link to activate your Champ.ai account.
          </p>

          {message && (
            <div className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="pt-2">
            {email ? (
              <Button
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className="w-full"
              >
                {resending ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin inline" />
                    Resending email...
                  </>
                ) : cooldown > 0 ? (
                  `Resend email in ${cooldown}s`
                ) : (
                  "Resend verification email"
                )}
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/login")}
                className="w-full"
              >
                Go to Sign In
              </Button>
            )}
          </div>

          <div className="text-center text-sm mt-4">
            <Link to="/login" className="text-blue-500 hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
