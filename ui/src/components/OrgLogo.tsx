/**
 * OrgLogo — shared logo components for A Forever Home.
 *
 * Both variants attempt to load the real SVG from /public/icons/ and fall
 * back to a text/icon placeholder if the file is missing.
 *
 * To activate the logos:
 *   1. Download the round SVG from Google Drive and save as:
 *        ui/public/icons/afh-logo-round.svg
 *   2. Download the full/square SVG from Google Drive and save as:
 *        ui/public/icons/afh-logo.svg
 *
 * Drive links (require AFH Google account):
 *   Round:  https://drive.google.com/file/d/1QOKHQtPUuswse3naAOJ9VP-6FT6IzPfH/view
 *   Square: https://drive.google.com/file/d/107jfd0drhGsGOp9gJ3YrqxyhmF_UBg0l/view
 */

import { useState } from "react"
import { PawPrint } from "lucide-react"

// ─── Round logo (used in dashboard empty state, app shell, etc.) ──────────────

interface OrgLogoRoundProps {
  /** Tailwind classes applied to both the <img> and the fallback wrapper */
  className?: string
  /** px size for the fallback icon (default 40) */
  fallbackSize?: number
}

export function OrgLogoRound({ className, fallbackSize = 40 }: OrgLogoRoundProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={
          className ??
          "flex items-center justify-center rounded-full bg-primary/10"
        }
        style={{ width: fallbackSize, height: fallbackSize }}
      >
        <PawPrint
          className="text-primary"
          style={{ width: fallbackSize * 0.5, height: fallbackSize * 0.5 }}
        />
      </div>
    )
  }

  return (
    <img
      src="/icons/afh-logo-round.svg"
      alt="A Forever Home"
      className={className ?? "object-contain"}
      style={{ width: fallbackSize, height: fallbackSize }}
      onError={() => setFailed(true)}
    />
  )
}

// ─── Full / square logo (used on login page, landing page) ────────────────────

interface OrgLogoFullProps {
  className?: string
  /** px height for the logo image (default 56) */
  height?: number
}

export function OrgLogoFull({ className, height = 56 }: OrgLogoFullProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <PawPrint className="h-10 w-10 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          A Forever Home
        </span>
      </div>
    )
  }

  return (
    <img
      src="/icons/afh-logo.svg"
      alt="A Forever Home"
      className={className ?? "object-contain"}
      style={{ height }}
      onError={() => setFailed(true)}
    />
  )
}
