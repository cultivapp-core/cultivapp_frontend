import { forwardRef } from "react";

const variants = {
  neutral:
    "border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900",

  primary:
    "border border-lime-100 bg-lime-50 text-[#659000] hover:bg-lime-100",

  info:
    "border border-blue-100 bg-blue-50 text-blue-600 hover:bg-blue-100",

  danger:
    "border border-red-100 bg-red-50 text-red-600 hover:bg-red-100",
};

const sizes = {
  sm: "h-9 w-9 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-11 w-11 rounded-xl",
};

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const IconButton = forwardRef(
  (
    {
      label,
      type = "button",
      variant = "neutral",
      size = "md",
      children,
      className = "",
      disabled = false,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={joinClasses(
        "inline-flex shrink-0 items-center justify-center",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "focus-visible:ring-[#87be00]",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant] ?? variants.neutral,
        sizes[size] ?? sizes.md,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

IconButton.displayName = "IconButton";

export default IconButton;