import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import { Textarea } from "@/components/form/sections/Section4Pets"
import type { ApplicationFields } from "@/hooks/useApplication"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

export function Section6DogCare({ formData, setField, canEdit }: Props) {
  return (
    <FormSection
      title="Dog Care Plan"
      description="Help us understand how you plan to care for your new dog."
    >
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="hoursAlonePerDay">Hours Alone Per Day</Label>
          <Input
            id="hoursAlonePerDay"
            type="number"
            min={0}
            max={24}
            value={formData.hoursAlonePerDay === "" ? "" : formData.hoursAlonePerDay}
            onChange={(e) => {
              const v = e.target.value === "" ? "" : parseInt(e.target.value, 10)
              setField("hoursAlonePerDay", v)
            }}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dogSleepLocation">Where will the dog sleep?</Label>
          <Input
            id="dogSleepLocation"
            value={formData.dogSleepLocation}
            onChange={(e) => setField("dogSleepLocation", e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. In the bedroom, crate in the living room"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dogDayLocation">Where will the dog be during the day?</Label>
          <Input
            id="dogDayLocation"
            value={formData.dogDayLocation}
            onChange={(e) => setField("dogDayLocation", e.target.value)}
            disabled={!canEdit}
            placeholder="e.g. Home with family, yard, doggy daycare"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exercisePlan">Exercise Plan</Label>
          <Textarea
            id="exercisePlan"
            value={formData.exercisePlan}
            onChange={(v) => setField("exercisePlan", v)}
            disabled={!canEdit}
            placeholder="Describe your plan for daily walks, play, and exercise."
            rows={4}
          />
        </div>
      </div>
    </FormSection>
  )
}
