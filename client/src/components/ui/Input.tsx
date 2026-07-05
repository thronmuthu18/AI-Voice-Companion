import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`
          flex
          h-11
          w-full
          rounded-lg
          border
          border-gray-300
          bg-white
          px-4
          py-2
          text-sm
          text-gray-900
          placeholder:text-gray-400
          outline-none
          transition-all
          duration-200
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-500/20
          disabled:cursor-not-allowed
          disabled:opacity-50
          ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export { Input };