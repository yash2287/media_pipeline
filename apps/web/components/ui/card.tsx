import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  hoverable,
  glass,
  raise,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean;
  glass?: boolean;
  raise?: boolean;
}) {
  return (
    <div
      className={cn(
        raise ? "panel-raise" : glass ? "panel-glass" : "panel",
        hoverable && "card-hover",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardEyebrow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("eyebrow", className)} {...props} />;
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-[14px] font-semibold tracking-[-0.005em] text-[var(--ink)]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-[13px] leading-5 text-[var(--ink-3)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
