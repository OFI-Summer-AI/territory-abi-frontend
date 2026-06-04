import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/ui/dialog"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Input } from "@/shared/ui/input"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

export function ChatModal() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const sessionId = useMemo(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto as any).randomUUID()
    }
    return Math.random().toString(36).slice(2)
  }, [])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setMessages((prev) => [...prev, { role: "user", content: text }])
    setInput("")
    try {
      const res = await fetch("https://n8n.sofiatechnology.ai/webhook/planning-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      })
      if (!res.ok) throw new Error(`Solicitud fallida: ${res.status}`)
      const data: { answer?: string } = await res.json()
      const answer = data?.answer ?? "(No hay campo de respuesta en la respuesta)"
      setMessages((prev) => [...prev, { role: "assistant", content: answer }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error de solicitud: ${err?.message ?? "desconocido"}` },
      ])
    } finally {
      setSending(false)
    }
  }

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
          <ScrollArea className="h-64 rounded-md border p-3">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">Inicia una conversación…</div>
              )}
              {messages.map((m, idx) => (
                <div key={idx} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      m.role === "user"
                        ? "inline-block rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                        : "inline-block rounded-lg bg-muted px-3 py-2"
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-end gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje…"
              className="w-full"
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? "Enviando…" : "Enviar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


