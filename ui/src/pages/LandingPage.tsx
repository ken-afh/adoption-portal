import React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { ClipboardList, Search, Heart } from "lucide-react"
import { OrgLogoFull } from "@/components/OrgLogo"

export default function LandingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleApply = () => {
    navigate(user ? "/dashboard" : "/register")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6">
          <OrgLogoFull height={80} />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Find Your Forever Dog
        </h1>
        <p className="mb-8 max-w-md text-lg text-muted-foreground">
          We believe every dog deserves a loving home. Start your adoption
          journey today — our team personally reviews every application to make
          the perfect match.
        </p>
        <Button size="lg" className="h-12 px-8 text-base" onClick={handleApply}>
          Apply to Adopt
        </Button>
        {!user && (
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              type="button"
              className="text-primary underline underline-offset-4"
              onClick={() => navigate("/login")}
            >
              Sign in
            </button>
          </p>
        )}
      </section>

      {/* 3-step process */}
      <section className="border-t bg-muted/40 px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-semibold">
          How It Works
        </h2>
        <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
          <Step
            icon={<ClipboardList className="h-6 w-6" />}
            number={1}
            title="Apply"
            description="Fill out our short adoption questionnaire. It takes about 10 minutes."
          />
          <Step
            icon={<Search className="h-6 w-6" />}
            number={2}
            title="Get Reviewed"
            description="Our team reviews your application and may reach out with a few questions."
          />
          <Step
            icon={<Heart className="h-6 w-6" />}
            number={3}
            title="Bring Home Your Dog"
            description="Once approved, we'll schedule a meet-and-greet and help with the transition."
          />
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} A Forever Home. All rights reserved.
      </footer>
    </div>
  )
}

function Step({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode
  number: number
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {icon}
      </div>
      <div className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Step {number}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
