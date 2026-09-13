import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import type { ApplicationFields } from "@/hooks/useApplication"
import { cn } from "@/lib/utils"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

function Textarea({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  rows = 4,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      )}
    />
  )
}

export { Textarea }

export function Section4Pets({ formData, setField, canEdit }: Props) {
  return (
    <FormSection
      title="Current & Previous Pets"
      description="Help us understand your experience caring for animals."
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="currentPets">Current Pets</Label>
          <Textarea
            id="currentPets"
            value={formData.currentPets}
            onChange={(v) => setField("currentPets", v)}
            disabled={!canEdit}
            placeholder="Please describe any current pets (species, breed, age, spayed/neutered, how long owned). List one per line."
            rows={5}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="previousPets">Previous Pets</Label>
          <Textarea
            id="previousPets"
            value={formData.previousPets}
            onChange={(v) => setField("previousPets", v)}
            disabled={!canEdit}
            placeholder="Please describe any previous pets you've owned."
            rows={4}
          />
        </div>
      </div>
    </FormSection>
  )
}
