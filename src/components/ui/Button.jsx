import { forwardRef } from "react";

const baseClasses = [
  "inline-flex",
  "items-center",
  "justify-center",
  "gap-2",
  "font-black",
  "uppercase",
  "tracking-wider",
  "transition-all",
  "duration-200",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-offset-2",
  "disabled:pointer-events-none",
  "disabled:cursor-not-allowed",
  "disabled:opacity-50",
].join(" ");

const variants = {
  primary:
    "bg-[#87be00] text-white shadow-md hover:bg-[#76a500] focus-visible:ring-[#87be00]",

  secondary:
    "border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:ring-gray-300",

  danger:
    "bg-red-600 text-white shadow-md hover:bg-red-700 focus-visible:ring-red-500",

  dangerSoft:
    "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-300",

  outline:
    "border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-[#87be00] hover:text-[#659000] focus-visible:ring-[#87be00]",

  ghost:
    "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-300",

  success:
    "bg-emerald-600 text-white shadow-md hover:bg-emerald-700 focus-visible:ring-emerald-500",
};

const sizes = {
  sm: "min-h-9 rounded-lg px-3 py-2 text-[9px]",
  md: "min-h-11 rounded-xl px-5 py-3 text-[10px]",
  lg: "min-h-12 rounded-xl px-7 py-3.5 text-xs",
};

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const Button = forwardRef(
  (
    {
      children,
      type = "button",
      variant = "primary",
      size = "md",
      loading = false,
      loadingText = "Procesando...",
      leftIcon,
      rightIcon,
      fullWidth = false,
      className = "",
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading}
        className={joinClasses(
          baseClasses,
          variants[variant] ?? variants.primary,
          sizes[size] ?? sizes.md,
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />

            <span>{loadingText}</span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span aria-hidden="true" className="shrink-0">
                {leftIcon}
              </span>
            )}

            <span>{children}</span>

            {rightIcon && (
              <span aria-hidden="true" className="shrink-0">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;