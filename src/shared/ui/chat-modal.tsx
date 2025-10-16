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
      const res = await fetch("https://n8n.sofiatechnology.ai/webhook/ABI-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: { answer?: string } = await res.json()
      const answer = data?.answer ?? "(No answer field in response)"
      setMessages((prev) => [...prev, { role: "assistant", content: answer }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Request error: ${err?.message ?? "unknown"}` },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Chat</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>ABI Assistant</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[320px] flex-col gap-3">
          <ScrollArea className="h-64 rounded-md border p-3">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground">Start a conversation…</div>
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
              placeholder="Type your message…"
              className="w-full"
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


