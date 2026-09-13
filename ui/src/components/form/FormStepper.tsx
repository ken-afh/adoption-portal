import { cn } from "@/lib/utils"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FormStepperProps {
  currentSection: number
  totalSections: number
  onNext: () => void
  onBack: () => void
  isSaving: boolean
  isDirty: boolean
  canProceed?: boolean
}

export function FormStepper({
  currentSection,
  totalSections,
  onNext,
  onBack,
  isSaving,
  isDirty,
  canProceed = true,
}: FormStepperProps) {
  const progress = ((currentSection + 1) / totalSections) * 100
  const isLastSection = currentSection === totalSections - 1

  return (
    <>
      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Progress dots ─────────────────────────────────────────────── */}
      <div className="flex justify-center gap-1.5 py-3">
        {Array.from({ length: totalSections }, (_, i) => (
          <span
            key={i}
            className={cn(
              "inline-block rounded-full transition-all duration-200",
              i === currentSection
                ? "h-2.5 w-2.5 bg-primary"
                : i < currentSection
                ? "h-2 w-2 bg-primary/40"
                : "h-2 w-2 bg-muted-foreground/25"
            )}
          />
        ))}
      </div>

      {/* ── Saving indicator ──────────────────────────────────────────── */}
      <div className="flex justify-center pb-1 text-xs text-muted-foreground h-5">
        {isSaving ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        ) : !isDirty ? (
          <span className="flex items-center gap-1 text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        ) : null}
      </div>

      {/* ── Bottom nav bar ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={currentSection === 0}
          className="w-20"
        >
          Back
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums">
          Step {currentSection + 1} of {totalSections}
        </span>

        <Button
          type="button"
          size="sm"
          onClick={onNext}
          disabled={!canProceed}
          className="w-32"
        >
          {isLastSection ? "Review & Submit" : "Next"}
        </Button>
      </div>
    </>
  )
}
