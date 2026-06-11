import { useEffect, useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Input } from "@/shared/ui/input"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
  options?: string[]
}

type Stage = "idle" | "thinking_greeting" | "greeted" | "thinking_option" | "done"

const GREETING_OPTIONS = [
  "Analizar el rendimiento de rutas actuales",
  "Identificar clientes con bajo cumplimiento",
  "Simular optimización de rutas",
  "Predecir la demanda del próximo mes",
]

const GREETING_REPLY = `¡Hola! Soy el Asistente de Planificación de Territorio.

Analizo rutas, clientes y KPIs operativos para ayudarte a tomar mejores decisiones logísticas.

¿En qué puedo ayudarte hoy?`

const OPTION_1_REPLY = `Análisis de Rendimiento de Rutas — 10 Ene 2025

Resumen de las 12 rutas activas del centro:

• Utilización promedio: 78.4% de capacidad en kg
• Mejor ruta: route-03 — 94% utilización, 23 paradas
• Rutas de bajo rendimiento: 3 rutas con utilización < 70%
• Kilómetros totales: 847.2 km
• Tiempo operativo total: 42.3 horas
• Costo promedio por ruta: $2,340,000 COP
• Costo promedio por km: $13,867 COP/km

Recomendación: Consolidar las 3 rutas con menor utilización puede reducir los costos operativos entre un 8 y 12%, ahorrando aproximadamente $1.8M COP por jornada. Puedes validar este escenario en el Simulador de Rutas.`

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function ChatModal() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stage, setStage] = useState<Stage>("idle")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, stage])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || stage !== "idle") return
    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setStage("thinking_greeting")
    await delay(1800)
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: GREETING_REPLY, options: GREETING_OPTIONS },
    ])
    setStage("greeted")
  }

  const handleOption = async (label: string, index: number) => {
    if (stage !== "greeted") return
    setMessages((prev) => [...prev, { role: "user", content: label }])
    setStage("thinking_option")
    await delay(2200)
    const reply =
      index === 0
        ? OPTION_1_REPLY
        : "Esta funcionalidad estará disponible próximamente. Por ahora, prueba la opción 1 para ver un análisis detallado de rutas."
    setMessages((prev) => [...prev, { role: "assistant", content: reply }])
    setStage("done")
  }

  const handleReset = () => {
    setMessages([])
    setStage("idle")
    setInput("")
  }

  const isThinking = stage === "thinking_greeting" || stage === "thinking_option"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Asistente</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Asistente de Planificación</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[320px] flex-col gap-3">
          <ScrollArea className="h-72 rounded-md border p-3">
            <div className="space-y-3">
              {messages.length === 0 && !isThinking && (
                <p className="text-sm text-muted-foreground">Escribe "Hola" para comenzar…</p>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      m.role === "user"
                        ? "inline-block rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "inline-block rounded-lg bg-muted px-3 py-2 text-sm whitespace-pre-wrap text-left"
                    }
                  >
                    {m.content}
                  </div>

                  {m.options && stage === "greeted" && (
                    <div className="mt-2 space-y-1.5">
                      {m.options.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOption(opt, idx)}
                          className="block w-full rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/15 cursor-pointer"
                        >
                          {idx + 1}. {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="text-left">
                  <div className="inline-flex items-center gap-1 rounded-lg bg-muted px-4 py-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {stage === "idle" && (
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Escribe tu mensaje…"
              />
              <Button onClick={handleSend} disabled={!input.trim()}>
                Enviar
              </Button>
            </div>
          )}

          {stage === "done" && (
            <Button variant="outline" onClick={handleReset}>
              Reiniciar conversación
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
