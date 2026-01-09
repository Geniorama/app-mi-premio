"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "tertiary";
}

export default function Button({
  children,
  onClick,
  className,
  type,
  disabled,
  variant = "primary",
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg shadow-md hover:shadow-lg ${variant === "primary" && "bg-accent text-background"} ${variant === "secondary" && "bg-custom-green text-white"} ${variant === "tertiary" && "bg-white text-custom-green"}
         px-5 text-background transition-colors bg-accent md:w-[158px] ${className} ${onClick ? "cursor-pointer pointer-events-auto" : "cursor-auto pointer-events-none"}`}
    >
      {children}
    </button>
  );
}
