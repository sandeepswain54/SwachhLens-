import { Bot, Lightbulb, Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { askAssistant, buildAssistantDigest, type ChatMessage } from '@/lib/assistant';
import type { ReportRow } from '@/lib/reports';
import type { AssignmentRow, TeamRow } from '@/lib/teams';
import type { VehicleRow } from '@/lib/vehicles';

const WELCOME_MESSAGE = `Hello Admin! 👋
I'm your AI assistant. You can ask me about:
• Complaints and their status
• Waste hotspots
• Team performance
• Waste collected
• Vehicle availability
• Trends and insights
• And much more...`;

const QUICK_ACTIONS: Array<{ label: string; prompt: string }> = [
  { label: 'Top 5 Waste Hotspots', prompt: 'What are the top 5 waste hotspots right now?' },
  { label: 'Team Performance This Week', prompt: 'How are the teams performing this week?' },
  { label: 'Complaints Trend', prompt: "What's the complaints trend compared to last week?" },
  { label: 'Waste by Category', prompt: 'Break down complaints by waste category.' },
  { label: 'Export Summary', prompt: 'Give me a short summary of today\'s overall operations.' },
];

const TIP_PROMPTS = [
  'How many vehicles are available today?',
  'Which area has the most complaints this week?',
  'What is our average resolution time?',
  'How much waste have we collected this week?',
  'Which team has the highest efficiency?',
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AIAssistantChat({
  reports,
  teams,
  assignments,
  vehicles,
  dateRangeLabel,
  locationLabel,
}: {
  reports: ReportRow[];
  teams: TeamRow[];
  assignments: AssignmentRow[];
  vehicles: VehicleRow[];
  dateRangeLabel: string;
  locationLabel: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'bot', text: WELCOME_MESSAGE, at: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Rebuilt on every render from whatever the live contexts hold right now
  // — a question asked a minute from now sees a minute's worth of new
  // reports/status changes, same as the rest of the page.
  const digest = useMemo(
    () => buildAssistantDigest(reports, teams, assignments, vehicles, dateRangeLabel, locationLabel),
    [reports, teams, assignments, vehicles, dateRangeLabel, locationLabel]
  );

  async function handleSend(question: string) {
    const text = question.trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = { id: newId(), role: 'user', text, at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setShowTips(false);
    setSending(true);

    try {
      const answer = await askAssistant(text, digest, messages);
      setMessages((prev) => [...prev, { id: newId(), role: 'bot', text: answer, at: new Date().toISOString() }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((prev) => [...prev, { id: newId(), role: 'bot', text: `⚠️ ${message}`, at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 pb-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
            <Bot size={19} />
          </span>
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">AI Assistant</h2>
            <p className="text-[12px] text-slate-400">
              Ask anything about city cleanliness data, reports, hotspots, teams or waste management.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowTips((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
          <Lightbulb size={13} /> Tips
        </button>
      </div>

      {showTips && (
        <div className="mb-3 flex flex-wrap gap-1.5 rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          {TIP_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void handleSend(p)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] text-slate-600 hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:bg-[#111814] dark:text-slate-300">
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m) => (
          <div key={m.id} className={`flex items-start gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'bot' && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                <Bot size={13} />
              </span>
            )}
            <div className={`flex max-w-[80%] flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.role === 'user'
                    ? 'rounded-tr-sm bg-brand-50 text-slate-800 dark:bg-brand-500/15 dark:text-slate-100'
                    : 'rounded-tl-sm bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-200'
                }`}>
                {m.text}
              </div>
              <span className="px-1 text-[10.5px] text-slate-400">
                {new Date(m.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
              <Bot size={13} />
            </span>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5 dark:bg-white/5">
              <Loader2 size={13} className="animate-spin text-slate-400" />
              <span className="text-[12px] text-slate-400">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={sending}
            onClick={() => void handleSend(a.prompt)}
            className="rounded-full border border-slate-200 px-2.5 py-1 text-[11.5px] font-medium text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-50 dark:border-white/10 dark:text-slate-300">
            {a.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend(input);
        }}
        className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything..."
          disabled={sending}
          className="flex-1 bg-transparent text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-40">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
