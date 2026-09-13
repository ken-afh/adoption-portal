import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import type { ApplicationFields } from "@/hooks/useApplication"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

export function Section5Vet({ formData, setField, canEdit }: Props) {
  return (
    <FormSection
      title="Veterinarian"
      description="If you have existing pets, please provide your vet's information."
    >
      <div className="grid gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="vetName">Veterinarian Name</Label>
          <Input
            id="vetName"
            value={formData.vetName}
            onChange={(e) => setField("vetName", e.target.value)}
            disabled={!canEdit}
            placeholder="Dr. Smith"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vetClinic">Clinic Name</Label>
          <Input
            id="vetClinic"
            value={formData.vetClinic}
            onChange={(e) => setField("vetClinic", e.target.value)}
            disabled={!canEdit}
            placeholder="Happy Paws Animal Hospital"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="vetPhone">Clinic Phone</Label>
          <Input
            id="vetPhone"
            type="tel"
            value={formData.vetPhone}
            onChange={(e) => setField("vetPhone", e.target.value)}
            disabled={!canEdit}
            placeholder="(555) 555-5555"
          />
        </div>
      </div>
    </FormSection>
  )
}
