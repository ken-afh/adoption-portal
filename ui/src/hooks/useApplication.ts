import { useEffect, useRef, useState, useCallback } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { db, functions } from "@/firebase"
import type { FirestoreApplication } from "@/components/ApplicationCard"

// ─── ApplicationFields ────────────────────────────────────────────────────────

export type ApplicationFields = {
  applicantName: string
  coApplicantName: string
  address: string
  city: string
  state: string
  zip: string
  phone: string
  homeType: "house" | "condo" | "apartment" | "other" | ""
  homeOwnership: "own" | "rent" | ""
  landlordContact: string
  hasYard: boolean
  yardFenced: boolean
  fenceHeight: string
  adultsInHome: number | ""
  childrenInHome: number | ""
  childrenAges: string
  currentPets: string
  previousPets: string
  vetName: string
  vetClinic: string
  vetPhone: string
  hoursAlonePerDay: number | ""
  dogSleepLocation: string
  dogDayLocation: string
  exercisePlan: string
  dogExperience: string
  adoptionReason: string
  specificDogRequested: string
  agreeToHomeVisit: boolean
  signatureAcknowledgment: boolean
  signatureName: string
  specificDogName: string
}

// ─── Statuses that allow editing ──────────────────────────────────────────────

const EDITABLE_STATUSES: FirestoreApplication["status"][] = [
  "draft",
  "clarification_requested",
  "rejected",
]

// ─── Default empty form data ──────────────────────────────────────────────────

const DEFAULT_FIELDS: ApplicationFields = {
  applicantName: "",
  coApplicantName: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  homeType: "",
  homeOwnership: "",
  landlordContact: "",
  hasYard: false,
  yardFenced: false,
  fenceHeight: "",
  adultsInHome: "",
  childrenInHome: "",
  childrenAges: "",
  currentPets: "",
  previousPets: "",
  vetName: "",
  vetClinic: "",
  vetPhone: "",
  hoursAlonePerDay: "",
  dogSleepLocation: "",
  dogDayLocation: "",
  exercisePlan: "",
  dogExperience: "",
  adoptionReason: "",
  specificDogRequested: "",
  agreeToHomeVisit: false,
  signatureAcknowledgment: false,
  signatureName: "",
  specificDogName: "",
}

// ─── Extract editable fields from a Firestore document ───────────────────────

function extractFields(app: FirestoreApplication): ApplicationFields {
  const a = app as unknown as Record<string, unknown>
  return {
    applicantName: (a.applicantName as string) ?? "",
    coApplicantName: (a.coApplicantName as string) ?? "",
    address: (a.address as string) ?? "",
    city: (a.city as string) ?? "",
    state: (a.state as string) ?? "",
    zip: (a.zip as string) ?? "",
    phone: (a.phone as string) ?? "",
    homeType: (a.homeType as ApplicationFields["homeType"]) ?? "",
    homeOwnership: (a.homeOwnership as ApplicationFields["homeOwnership"]) ?? "",
    landlordContact: (a.landlordContact as string) ?? "",
    hasYard: (a.hasYard as boolean) ?? false,
    yardFenced: (a.yardFenced as boolean) ?? false,
    fenceHeight: (a.fenceHeight as string) ?? "",
    adultsInHome: (a.adultsInHome as number) ?? "",
    childrenInHome: (a.childrenInHome as number) ?? "",
    childrenAges: (a.childrenAges as string) ?? "",
    currentPets: (a.currentPets as string) ?? "",
    previousPets: (a.previousPets as string) ?? "",
    vetName: (a.vetName as string) ?? "",
    vetClinic: (a.vetClinic as string) ?? "",
    vetPhone: (a.vetPhone as string) ?? "",
    hoursAlonePerDay: (a.hoursAlonePerDay as number) ?? "",
    dogSleepLocation: (a.dogSleepLocation as string) ?? "",
    dogDayLocation: (a.dogDayLocation as string) ?? "",
    exercisePlan: (a.exercisePlan as string) ?? "",
    dogExperience: (a.dogExperience as string) ?? "",
    adoptionReason: (a.adoptionReason as string) ?? "",
    specificDogRequested: (a.specificDogRequested as string) ?? "",
    agreeToHomeVisit: (a.agreeToHomeVisit as boolean) ?? false,
    signatureAcknowledgment: (a.signatureAcknowledgment as boolean) ?? false,
    signatureName: (a.signatureName as string) ?? "",
    specificDogName: (a.specificDogName as string) ?? "",
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApplication(applicationId: string) {
  const [application, setApplication] = useState<FirestoreApplication | null>(null)
  const [formData, setFormData] = useState<ApplicationFields>(DEFAULT_FIELDS)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track whether the next snapshot update should reinitialize form data
  const initializedRef = useRef(false)

  const canEdit = application ? EDITABLE_STATUSES.includes(application.status) : false

  // ── Real-time listener ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "applications", applicationId), (snap) => {
      if (!snap.exists()) return
      const data = { id: snap.id, ...(snap.data() as Omit<FirestoreApplication, "id">) }
      setApplication(data)
      // Only initialize form data from Firestore on the first snapshot
      if (!initializedRef.current) {
        initializedRef.current = true
        setFormData(extractFields(data))
      }
    })
    return unsubscribe
  }, [applicationId])

  // ── setField ───────────────────────────────────────────────────────────────
  const setField = useCallback(
    (field: keyof ApplicationFields, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setIsDirty(true)
      setSaveError(null)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        if (!canEdit) return
        setIsSaving(true)
        try {
          const saveApplication = httpsCallable<
            { applicationId: string; fields: Partial<ApplicationFields> },
            void
          >(functions, "saveApplication")
          await saveApplication({
            applicationId,
            fields: { [field]: value } as Partial<ApplicationFields>,
          })
          setIsDirty(false)
        } catch (err) {
          setSaveError(err instanceof Error ? err.message : "Failed to save")
        } finally {
          setIsSaving(false)
        }
      }, 3000)
    },
    [applicationId, canEdit]
  )

  // ── submit ─────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setIsSubmitting(true)
    try {
      const submitApplication = httpsCallable<{ applicationId: string }, void>(
        functions,
        "submitApplication"
      )
      await submitApplication({ applicationId })
    } finally {
      setIsSubmitting(false)
    }
  }, [applicationId])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return {
    application,
    formData,
    setField,
    isDirty,
    isSaving,
    saveError,
    canEdit,
    submit,
    isSubmitting,
  }
}
