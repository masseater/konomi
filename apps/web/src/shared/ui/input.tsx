import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Input = ({ className, type, ...props }: ComponentProps<"input">): ReactNode => (
  <input
    type={type}
    data-slot="input"
    className={cn(
      "h-10 w-full min-w-0 rounded-full border border-input bg-muted px-4 py-1 text-base shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
      "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      className,
    )}
    {...props}
  />
);

export { Input };
