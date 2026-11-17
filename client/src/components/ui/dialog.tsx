import * as React from "react";
import * as Primitive from "@radix-ui/react-dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
export const Dialog = Primitive.Root,
  DialogTrigger = Primitive.Trigger,
  DialogClose = Primitive.Close,
  DialogTitle = Primitive.Title,
  DialogDescription = Primitive.Description;
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof Primitive.Content>,
  React.ComponentPropsWithoutRef<typeof Primitive.Content>
>(({ className, children, ...props }, ref) => (
  <Primitive.Portal>
    <Primitive.Overlay className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm" />
    <Primitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-[15%] z-[101] grid w-[calc(100%_-_2rem)] max-h-[85dvh] overflow-y-auto max-w-xl -translate-x-1/2 gap-4 rounded-xl border bg-background p-6 shadow-xl focus:outline-none",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Close className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-md text-muted-foreground focus-visible:ring-2">
        <X size={18} />
        <span className="sr-only">Close dialog</span>
      </Primitive.Close>
    </Primitive.Content>
  </Primitive.Portal>
));
DialogContent.displayName = "DialogContent";
