import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Input } from "../ui/Input";
import  Button  from "../ui/Button";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  const navigate = useNavigate();

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    try {
      await login({
        email,
        password,
      });

      navigate("/chat");

    } catch (err) {
      alert("Invalid email or password");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <div className="relative">

        <Input
          type={
            showPassword
              ? "text"
              : "password"
          }
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button
          type="button"
          onClick={() =>
            setShowPassword(
              !showPassword
            )
          }
          className="
            absolute
            right-3
            top-3
            text-slate-400
          "
        >
          {showPassword
            ? <EyeOff size={18} />
            : <Eye size={18} />}
        </button>

      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2
              size={18}
              className="mr-2 animate-spin"
            />
            Signing In...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}