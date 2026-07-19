import { forwardRef } from "react";

const joinClasses = (...classes) =>
  classes.filter(Boolean).join(" ");

const Switch = forwardRef(
  (
    {
      checked = false,
      disabled = false,
      label,
      onChange,
      className = "",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const sizes = {
      sm: {
        button: "h-5 w-9 p-0.5",
        circle: "h-4 w-4",
        activePosition: "translate-x-4",
      },

      md: {
        button: "h-6 w-11 p-0.5",
        circle: "h-5 w-5",
        activePosition: "translate-x-5",
      },

      lg: {
        button: "h-7 w-13 p-0.5",
        circle: "h-6 w-6",
        activePosition: "translate-x-6",
      },
    };

    const selectedSize = sizes[size] ?? sizes.md;

    const handleClick = () => {
      if (disabled) return;

      onChange?.(!checked);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={handleClick}
        className={joinClasses(
          "relative inline-flex shrink-0 items-center rounded-full",
          "transition-colors duration-200",
          "focus:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[#87be00]",
          "focus-visible:ring-offset-2",
          "disabled:pointer-events-none",
          "disabled:cursor-not-allowed",
          "disabled:opacity-40",
          checked ? "bg-[#87be00]" : "bg-slate-200",
          selectedSize.button,
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={joinClasses(
            "inline-block rounded-full bg-white shadow-sm",
            "transition-transform duration-200",
            selectedSize.circle,
            checked
              ? selectedSize.activePosition
              : "translate-x-0",
          )}
        />
      </button>
    );
  },
);

Switch.displayName = "Switch";

export default Switch;