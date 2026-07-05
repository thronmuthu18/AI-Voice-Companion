import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "../ui/Input";
import Button from "../ui/Button";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterForm() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      // Register the user
      await register({
        name,
        email,
        password,
      });

      // Auto login after successful registration
      await login({
        email,
        password,
      });

      navigate("/chat");
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Registration failed. Please try again."
      );
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
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={isLoading}
      />

      <Input
        type="email"
        placeholder="Email Address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
      />

      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
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
            <Loader2 size={18} className="mr-2 animate-spin" />
            Creating Account...
          </>
        ) : (
          "Sign Up"
        )}
      </Button>

      <div className="text-center text-sm text-slate-400 mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 hover:underline">
          Sign In
        </Link>
      </div>
    </form>
  );
}
