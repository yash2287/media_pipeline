import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-glow)] active:translate-y-[1px]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ink)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--ink-2)] btn-glow",
        accent:
          "bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] hover:bg-[var(--accent-ink)] btn-glow",
        secondary:
          "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-2)] hover:bg-[var(--surface-2)]",
        outline:
          "border border-[var(--line)] bg-transparent text-[var(--ink)] hover:bg-[var(--surface-2)] hover:border-[var(--line-2)]",
        ghost: "text-[var(--ink)] hover:bg-[var(--surface-3)]",
        "accent-soft":
          "bg-[var(--accent-soft)] text-[var(--accent-ink)] hover:bg-[#e3e6ff]",
        danger:
          "bg-[var(--danger)] text-white shadow-[var(--shadow-sm)] hover:bg-[#991b1b]",
        link:
          "text-[var(--accent)] hover:text-[var(--accent-ink)] underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-[8px]",
        default: "h-10 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";

export { buttonVariants };
