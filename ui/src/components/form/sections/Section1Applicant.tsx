import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormSection } from "@/components/form/FormSection"
import type { ApplicationFields } from "@/hooks/useApplication"
import { useAuth } from "@/context/AuthContext"

interface Props {
  formData: ApplicationFields
  setField: (field: keyof ApplicationFields, value: unknown) => void
  canEdit: boolean
}

export function Section1Applicant({ formData, setField, canEdit }: Props) {
  const { user } = useAuth()

  return (
    <FormSection
      title="Applicant Information"
      description="Please provide your contact information."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="applicantName">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="applicantName"
            value={formData.applicantName}
            onChange={(e) => setField("applicantName", e.target.value)}
            disabled={!canEdit}
            placeholder="Jane Doe"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="coApplicantName">Co-Applicant Name</Label>
          <Input
            id="coApplicantName"
            value={formData.coApplicantName}
            onChange={(e) => setField("coApplicantName", e.target.value)}
            disabled={!canEdit}
            placeholder="Optional"
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="address">Street Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setField("address", e.target.value)}
            disabled={!canEdit}
            placeholder="123 Main St"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setField("city", e.target.value)}
            disabled={!canEdit}
            placeholder="Springfield"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setField("state", e.target.value.toUpperCase().slice(0, 2))}
              disabled={!canEdit}
              placeholder="IL"
              maxLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="zip">Zip</Label>
            <Input
              id="zip"
              value={formData.zip}
              onChange={(e) => setField("zip", e.target.value)}
              disabled={!canEdit}
              placeholder="62701"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setField("phone", e.target.value)}
            disabled={!canEdit}
            placeholder="(555) 555-5555"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={user?.email ?? ""}
            disabled
            className="bg-muted text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">Your account email — not editable here.</p>
        </div>
      </div>
    </FormSection>
  )
}
