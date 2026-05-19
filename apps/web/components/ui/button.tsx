import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--purple)] px-4 py-2 text-white hover:bg-[#4b3275]",
        secondary: "bg-[var(--teal-soft)] px-4 py-2 text-[var(--teal)] hover:bg-[#caece8]",
        outline: "border border-[var(--line)] bg-white px-4 py-2 text-[var(--foreground)] hover:bg-stone-50",
        ghost: "px-3 py-2 text-[var(--foreground)] hover:bg-stone-100",
        danger: "bg-[var(--danger)] px-4 py-2 text-white hover:bg-[#991b1b]",
      },
      size: {
        default: "h-10",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);

Button.displayName = "Button";

