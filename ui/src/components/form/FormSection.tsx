import type { ReactNode } from "react"

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="min-h-[calc(100dvh-8rem)] md:min-h-0 py-4">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
