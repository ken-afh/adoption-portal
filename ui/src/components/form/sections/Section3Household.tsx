import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import type { ApplicationFields } from "@/hooks/useApplication"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

export function Section3Household({ formData, setField, canEdit }: Props) {
  const childrenCount =
    typeof formData.childrenInHome === "number" ? formData.childrenInHome : 0

  return (
    <FormSection
      title="Household Members"
      description="Tell us who lives in your home."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="adultsInHome">Number of Adults</Label>
          <Input
            id="adultsInHome"
            type="number"
            min={1}
            value={formData.adultsInHome === "" ? "" : formData.adultsInHome}
            onChange={(e) => {
              const v = e.target.value === "" ? "" : parseInt(e.target.value, 10)
              setField("adultsInHome", v)
            }}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="childrenInHome">Number of Children</Label>
          <Input
            id="childrenInHome"
            type="number"
            min={0}
            value={formData.childrenInHome === "" ? "" : formData.childrenInHome}
            onChange={(e) => {
              const v = e.target.value === "" ? "" : parseInt(e.target.value, 10)
              setField("childrenInHome", v)
            }}
            disabled={!canEdit}
          />
        </div>

        {childrenCount > 0 && (
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="childrenAges">Ages of Children</Label>
            <Input
              id="childrenAges"
              value={formData.childrenAges}
              onChange={(e) => setField("childrenAges", e.target.value)}
              disabled={!canEdit}
              placeholder="e.g. 4, 7, 12"
            />
          </div>
        )}
      </div>
    </FormSection>
  )
}
