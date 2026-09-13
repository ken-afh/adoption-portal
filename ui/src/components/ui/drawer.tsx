/**
 * Drawer — mobile bottom-sheet pattern.
 * Custom implementation (no vaul dependency).
 */
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DrawerContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DrawerContext = React.createContext<DrawerContextValue>({
  open: false,
  onOpenChange: () => undefined,
})

interface DrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Drawer({ open: controlledOpen, onOpenChange, children }: DrawerProps) {
  const [uncontrolled, setUncontrolled] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolled

  const handleChange = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setUncontrolled(v)
      onOpenChange?.(v)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DrawerContext.Provider value={{ open, onOpenChange: handleChange }}>
      {children}
    </DrawerContext.Provider>
  )
}

function DrawerTrigger({
  children,
  asChild: _asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DrawerContext)
  return (
    <button type="button" onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  )
}

function DrawerClose({
  children,
  asChild: _asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = React.useContext(DrawerContext)
  return (
    <button type="button" onClick={() => onOpenChange(false)} {...props}>
      {children}
    </button>
  )
}

function DrawerPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DrawerOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = React.useContext(DrawerContext)
  if (!open) return null
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 transition-opacity",
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = React.useContext(DrawerContext)
  return (
    <>
      <DrawerOverlay />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background transition-transform duration-300",
          open ? "translate-y-0" : "translate-y-full",
          className
        )}
        {...props}
      >
        <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </>
  )
}

function DrawerHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DrawerFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
