import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import type { ApplicationFields } from "@/hooks/useApplication"
import { cn } from "@/lib/utils"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

function Checkbox({
  id,
  checked,
  onChange,
  disabled,
  label,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled: boolean
  label: string
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="text-sm leading-relaxed">{label}</span>
    </label>
  )
}

export function Section8Agreement({ formData, setField, canEdit }: Props) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <FormSection
      title="Agreement & Acknowledgment"
      description="Please read and agree to the following before submitting."
    >
      <div className="space-y-4">
        <Checkbox
          id="agreeToHomeVisit"
          checked={formData.agreeToHomeVisit}
          onChange={(v) => setField("agreeToHomeVisit", v)}
          disabled={!canEdit}
          label="I agree to a home visit as part of the adoption process."
        />

        <Checkbox
          id="signatureAcknowledgment"
          checked={formData.signatureAcknowledgment}
          onChange={(v) => setField("signatureAcknowledgment", v)}
          disabled={!canEdit}
          label="I acknowledge that all information provided is accurate and complete."
        />

        <div className="space-y-1.5">
          <Label htmlFor="signatureName">
            Digital Signature <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signatureName"
            value={formData.signatureName}
            onChange={(e) => setField("signatureName", e.target.value)}
            disabled={!canEdit}
            placeholder="Type your full legal name"
          />
          <p className="text-xs text-muted-foreground">
            Type your full name as your digital signature.
          </p>
        </div>

        <div className="rounded-md bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Date: </span>
          {today}
        </div>
      </div>
    </FormSection>
  )
}
