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

type RadioOption<T extends string> = { value: T; label: string }

function RadioGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  name: string
  value: T | ""
  options: RadioOption<T>[]
  onChange: (v: T) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
            value === opt.value
              ? "border-primary bg-primary/10 font-medium"
              : "border-input bg-background hover:bg-muted",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function Toggle({
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
        "flex cursor-pointer items-center justify-between gap-4 rounded-md border px-4 py-3",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span className="text-sm">{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          checked ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 translate-x-1 rounded-full bg-white transition-transform",
            checked && "translate-x-6"
          )}
        />
      </button>
    </label>
  )
}

export { Toggle, RadioGroup }

export function Section2Home({ formData, setField, canEdit }: Props) {
  return (
    <FormSection
      title="Home & Living Situation"
      description="Tell us about your home environment."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Home Type</Label>
          <RadioGroup
            name="homeType"
            value={formData.homeType}
            options={[
              { value: "house", label: "House" },
              { value: "condo", label: "Condo" },
              { value: "apartment", label: "Apartment" },
              { value: "other", label: "Other" },
            ]}
            onChange={(v) => setField("homeType", v)}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label>Do you own or rent?</Label>
          <RadioGroup
            name="homeOwnership"
            value={formData.homeOwnership}
            options={[
              { value: "own", label: "Own" },
              { value: "rent", label: "Rent" },
            ]}
            onChange={(v) => setField("homeOwnership", v)}
            disabled={!canEdit}
          />
        </div>

        {formData.homeOwnership === "rent" && (
          <div className="space-y-1.5">
            <Label htmlFor="landlordContact">Landlord Contact Info</Label>
            <Input
              id="landlordContact"
              value={formData.landlordContact}
              onChange={(e) => setField("landlordContact", e.target.value)}
              disabled={!canEdit}
              placeholder="Name, phone, or email"
            />
          </div>
        )}

        <Toggle
          id="hasYard"
          checked={formData.hasYard}
          onChange={(v) => setField("hasYard", v)}
          disabled={!canEdit}
          label="Does your home have a yard?"
        />

        {formData.hasYard && (
          <Toggle
            id="yardFenced"
            checked={formData.yardFenced}
            onChange={(v) => setField("yardFenced", v)}
            disabled={!canEdit}
            label="Is the yard fenced?"
          />
        )}

        {formData.hasYard && formData.yardFenced && (
          <div className="space-y-1.5">
            <Label htmlFor="fenceHeight">Fence Height</Label>
            <Input
              id="fenceHeight"
              value={formData.fenceHeight}
              onChange={(e) => setField("fenceHeight", e.target.value)}
              disabled={!canEdit}
              placeholder='e.g. 6 feet'
            />
          </div>
        )}
      </div>
    </FormSection>
  )
}
