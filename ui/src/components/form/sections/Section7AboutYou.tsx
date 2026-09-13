import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import { Textarea } from "@/components/form/sections/Section4Pets"
import { RadioGroup } from "@/components/form/sections/Section2Home"
import type { ApplicationFields } from "@/hooks/useApplication"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

export function Section7AboutYou({ formData, setField, canEdit }: Props) {
  return (
    <FormSection
      title="About You"
      description="Share your experience with dogs and your reasons for adopting."
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="dogExperience">
            Dog Experience <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="dogExperience"
            value={formData.dogExperience}
            onChange={(v) => setField("dogExperience", v)}
            disabled={!canEdit}
            placeholder="Describe your experience owning or caring for dogs."
            rows={4}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adoptionReason">
            Reason for Adopting <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="adoptionReason"
            value={formData.adoptionReason}
            onChange={(v) => setField("adoptionReason", v)}
            disabled={!canEdit}
            placeholder="Why do you want to adopt a dog at this time?"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>Do you have a specific dog in mind?</Label>
          <RadioGroup
            name="specificDogRequested"
            value={
              formData.specificDogRequested === "yes" ||
              formData.specificDogRequested === "no"
                ? formData.specificDogRequested
                : ""
            }
            options={[
              { value: "yes", label: "Yes — I have a specific dog in mind" },
              { value: "no", label: "No — I'm open to recommendations" },
            ]}
            onChange={(v) => setField("specificDogRequested", v)}
            disabled={!canEdit}
          />
        </div>

        {formData.specificDogRequested === "yes" && (
          <div className="space-y-1.5">
            <Label htmlFor="specificDogName">Dog Name / ID</Label>
            <Input
              id="specificDogName"
              value={formData.specificDogName}
              onChange={(e) => setField("specificDogName", e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. Buddy #A12345"
            />
          </div>
        )}
      </div>
    </FormSection>
  )
}
