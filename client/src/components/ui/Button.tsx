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
        rounded-xl
        bg-blue-600
        text-white
        px-4
        py-3
        font-medium
        transition-all
        duration-200
        hover:bg-blue-500
        hover:scale-[1.01]
        active:scale-[0.99]
        disabled:opacity-50
        disabled:scale-100
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}