import * as React from "react";
import { cn } from "@/lib/utils";

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-lg scale-100 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg animate-in fade-in-90 zoom-in-95">
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ className, children, ...props }) => (
  <div className={cn("grid gap-4", className)} {...props}>
    {children}
  </div>
);

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

export { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
