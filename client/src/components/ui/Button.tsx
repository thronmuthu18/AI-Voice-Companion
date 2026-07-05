import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
}

export default function Button({
  children,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`
        w-full
        rounded-lg
        bg-black
        text-white
        px-4
        py-3
        font-medium
        transition
        hover:opacity-90
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}