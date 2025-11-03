import { dancingScript } from "@/lib/fonts"

export default function Home() {
  return (
    <main className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: "#ffd6eb" }}>
      <p
        className={`${dancingScript.className} text-center text-pretty px-8`}
        style={{
          color: "#e75480",
          fontSize: "22px",
        }}
      >
        No matter how tough your life is, there is always time for change.
      </p>
    </main>
  )
}
