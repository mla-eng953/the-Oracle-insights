import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        gold: "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.12)] text-[hsl(var(--gold))]",
        win: "border-[hsl(var(--win)/0.5)] bg-[hsl(var(--win)/0.12)] text-[hsl(var(--win))]",
        loss: "border-[hsl(var(--loss)/0.5)] bg-[hsl(var(--loss)/0.12)] text-[hsl(var(--loss))]",
        push: "border-[hsl(var(--push)/0.5)] bg-[hsl(var(--push)/0.12)] text-[hsl(var(--push))]",
        muted: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
