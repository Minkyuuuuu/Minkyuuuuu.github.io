export type AutoDeleteOption = "1d" | "3d" | "1w" | "never"

export type AutoDeleteConfig = {
  value: AutoDeleteOption
  label: string
  seconds: number | null
}

export const AUTO_DELETE_OPTIONS: AutoDeleteConfig[] = [
  { value: "1d", label: "1 day", seconds: 60 * 60 * 24 },
  { value: "3d", label: "3 days", seconds: 60 * 60 * 24 * 3 },
  { value: "1w", label: "1 week", seconds: 60 * 60 * 24 * 7 },
  { value: "never", label: "Never expire", seconds: null },
]

const secondsLookup: Record<AutoDeleteOption, number | null> = AUTO_DELETE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.seconds
    return acc
  },
  {} as Record<AutoDeleteOption, number | null>,
)

export function computeExpiry(option: AutoDeleteOption, referenceDate = new Date()): Date | null {
  const seconds = secondsLookup[option]
  if (seconds === null) return null

  return new Date(referenceDate.getTime() + seconds * 1000)
}

export function isAutoDeleteOption(value: unknown): value is AutoDeleteOption {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(secondsLookup, value)
}
