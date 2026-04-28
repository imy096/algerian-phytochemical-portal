import { useState } from 'react';
import { Bot, Send, Sparkles, User, FlaskConical, Target, Leaf } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello. I am your AI Research Assistant. Ask me about plants, compounds, targets, evidence types, or how to navigate the portal.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts = [
    'What can I do in this portal?',
    'Summarize this database for a researcher',
    'How do I use the graph page?',
    'What kind of evidence is available for compounds?',
  ];

  async function sendMessage(text?: string) {
    const finalText = (text ?? input).trim();
    if (!finalText || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: finalText }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalText,
          history: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.answer || 'No answer was returned.',
        },
      ]);
    } catch (err) {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content:
            'I could not reach the assistant service. Please check that the backend is running and the /api/chat route is available.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f5f3ff,white_35%,#f8fafc_82%)] px-4 pb-10 pt-5 md:px-6 xl:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-stone-200 bg-violet-50 p-3">
                  <Bot className="h-6 w-6 text-violet-700" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-stone-900">AI Research Assistant</h1>
                  <p className="mt-2 text-sm leading-7 text-stone-600">
                    A conversational assistant for navigating the portal, explaining evidence, and giving quick scientific summaries.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-800">
                  Smart conversational help
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                  Grounded on portal data
                </span>
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-700">
                  Not a replacement for the Lab
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-900">What this assistant is good for</h2>

              <div className="mt-4 space-y-3 text-sm text-stone-600">
                <div className="flex gap-3">
                  <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-violet-700" />
                  <span>Quick compound summaries and evidence explanations</span>
                </div>
                <div className="flex gap-3">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                  <span>Target interpretation and portal navigation help</span>
                </div>
                <div className="flex gap-3">
                  <Leaf className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>Plant-oriented guidance and general portal questions</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-700" />
                <h2 className="text-lg font-semibold text-stone-900">Try asking</h2>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700 hover:bg-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-stone-900">Conversation</h2>
            </div>

            <div className="flex min-h-[600px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-7 ${
                        message.role === 'user'
                          ? 'bg-violet-600 text-white'
                          : 'border border-stone-200 bg-stone-50 text-stone-800'
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold opacity-80">
                        {message.role === 'user' ? (
                          <>
                            <User className="h-4 w-4" />
                            You
                          </>
                        ) : (
                          <>
                            <Bot className="h-4 w-4" />
                            Assistant
                          </>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ))}

                {loading ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold opacity-80">
                        <Bot className="h-4 w-4" />
                        Assistant
                      </div>
                      Thinking...
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-stone-200 p-4">
                <div className="flex gap-3">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about compounds, targets, plants, evidence, or how to use the portal..."
                    className="min-h-[64px] flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}