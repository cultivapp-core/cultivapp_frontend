const StatusButton = ({
  active,
  activeLabel = "Activo",
  inactiveLabel = "Inactivo",
  onClick,
  disabled = false,
  className = "",
}) => {
  const label = active ? activeLabel : inactiveLabel;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}. Presiona para cambiar el estado`}
      title="Cambiar estado"
      className={[
        "inline-flex min-h-8 items-center justify-center rounded-full px-3",
        "text-[9px] font-black uppercase tracking-wider",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus-visible:ring-emerald-400"
          : "bg-red-100 text-red-700 hover:bg-red-200 focus-visible:ring-red-400",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </button>
  );
};

export default StatusButton;