import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * KUSQA-branded Button component.
 *
 * Replaces the legacy `conventions.button.*` string-template pattern with
 * type-safe cva variants. Eliminates runtime symbol coupling: the consumer
 * never references design tokens as bare identifiers in JSX.
 *
 * Variants:
 *   - "primary":   hero CTA — gradient sunrise, shadow-glow, scale on hover/active
 *   - "secondary": subtle CTA — translucent backdrop, white text
 *
 * Usage:
 *   <KusqaButton variant="primary" asChild>
 *     <Link to="/app/mapa">Explorar misiones</Link>
 *   </KusqaButton>
 */
const kusqaButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-xs font-black transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-sunrise text-white shadow-glow hover:scale-[1.02] hover:shadow-lg active:scale-95",
        secondary:
          "bg-white/10 backdrop-blur-md border border-white/15 text-white font-bold hover:bg-white/20 hover:shadow-md active:scale-95",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export interface KusqaButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">,
    VariantProps<typeof kusqaButtonVariants> {
  asChild?: boolean;
  className?: string;
}

const KusqaButton = React.forwardRef<HTMLButtonElement, KusqaButtonProps>(
  ({ className, variant, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(kusqaButtonVariants({ variant }), className)} ref={ref} {...props} />
    );
  },
);
KusqaButton.displayName = "KusqaButton";

export { KusqaButton, kusqaButtonVariants };
