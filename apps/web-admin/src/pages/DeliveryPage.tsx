import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeliveryOpsSnapshot, DeliverySessionPublic } from '@bistro/shared-types';
import { apiFetch } from '../lib/api';

const STATE_LABELS: Record<string, string> = {
  greeting: 'Saludo',
  collecting_items: 'Tomando pedido',
  collecting_address: 'Pidiendo dirección',
  confirming: 'Confirmando',
  awaiting_payment: 'Esperando pago',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const JOB_STATUS_LABELS: Record<string, string> = {
  completed: 'OK',
  failed: 'Fallido',
  active: 'Activo',
  waiting: 'En cola',
  delayed: 'Demorado',
};

const QUICK_MESSAGES = [
  'Hola, quiero hacer un pedido',
  'Quiero 2 empanadas de carne',
  'Mi dirección es Av. Corrientes 1500, CABA',
  'Sí, confirmo el pedido',
  '¿Cuál es el estado de mi pedido?',
  'Cancelar pedido',
];

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function OpsPanel({ ops }: { ops: DeliveryOpsSnapshot | null }) {
  if (!ops) {
    return (
      <div className="mb-4 p-4 bg-surface border border-primary/10 rounded-xl text-sm text-primary/50">
        Cargando métricas del worker…
      </div>
    );
  }

  return (
    <div className="mb-4 bg-surface border border-primary/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-primary/10 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Observabilidad Delivery IA</p>
          <p className="text-xs text-primary/50">
            Cola BullMQ · actualizado {new Date(ops.lastUpdated).toLocaleTimeString('es-AR')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span
            className={`px-2 py-1 rounded-full ${ops.redisAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
          >
            Redis {ops.redisAvailable ? 'conectado' : 'sin conexión'}
          </span>
          <span
            className={`px-2 py-1 rounded-full ${ops.workerRunning ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
          >
            Worker {ops.workerRunning ? 'activo' : 'inactivo'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-primary/10">
        {(
          [
            ['En cola', ops.counts.waiting],
            ['Activos', ops.counts.active],
            ['Completados', ops.counts.completed],
            ['Fallidos', ops.counts.failed],
            ['Demorados', ops.counts.delayed],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-surface px-4 py-3 text-center">
            <p className="text-lg font-semibold">{value}</p>
            <p className="text-xs text-primary/50">{label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-primary/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-primary/50 text-xs">Latencia promedio</p>
          <p className="font-medium">{formatMs(ops.latencyMs.avg)}</p>
        </div>
        <div>
          <p className="text-primary/50 text-xs">Latencia p95</p>
          <p className="font-medium">{formatMs(ops.latencyMs.p95)}</p>
        </div>
        <div>
          <p className="text-primary/50 text-xs">Muestras</p>
          <p className="font-medium">{ops.latencyMs.sampleSize}</p>
        </div>
      </div>

      {ops.failedJobs.length > 0 && (
        <div className="border-t border-primary/10 px-4 py-3">
          <p className="text-sm font-medium mb-2 text-red-700">Últimos jobs fallidos</p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {ops.failedJobs.map((job) => (
              <li key={job.id} className="text-xs bg-red-50 border border-red-100 rounded-lg p-2">
                <div className="flex justify-between gap-2">
                  <span className="font-mono">#{job.id}</span>
                  <span className="text-primary/50">{job.platform}</span>
                </div>
                <p className="text-red-800 mt-1">{job.failedReason}</p>
                {job.messagePreview && (
                  <p className="text-primary/60 mt-1 truncate">{job.messagePreview}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {ops.recentJobs.length > 0 && (
        <div className="border-t border-primary/10 px-4 py-3">
          <p className="text-sm font-medium mb-2">Actividad reciente</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-primary/50">
                  <th className="pb-1 pr-2">Job</th>
                  <th className="pb-1 pr-2">Estado</th>
                  <th className="pb-1 pr-2">Canal</th>
                  <th className="pb-1 pr-2">Duración</th>
                  <th className="pb-1">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {ops.recentJobs.map((job) => (
                  <tr key={`${job.id}-${job.status}`} className="border-t border-primary/5">
                    <td className="py-1 pr-2 font-mono">{job.id}</td>
                    <td className="py-1 pr-2">{JOB_STATUS_LABELS[job.status] ?? job.status}</td>
                    <td className="py-1 pr-2">{job.platform}</td>
                    <td className="py-1 pr-2">{formatMs(job.durationMs)}</td>
                    <td className="py-1 truncate max-w-[200px]">{job.messagePreview ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!ops.redisAvailable && (
        <p className="px-4 py-3 text-sm text-amber-700 bg-amber-50 border-t border-amber-100">
          Redis no disponible. Ejecutá <code className="font-mono">npm run docker:up</code> y reiniciá la API
          para procesar mensajes del simulador.
        </p>
      )}
    </div>
  );
}

export function DeliveryPage() {
  const [phone, setPhone] = useState('5491112345678');
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState<DeliverySessionPublic[]>([]);
  const [ops, setOps] = useState<DeliveryOpsSnapshot | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [waitingReply, setWaitingReply] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const historyLenRef = useRef(0);

  const selected = sessions.find((s) => s.id === selectedId) ?? sessions[0] ?? null;

  const loadOps = useCallback(async () => {
    try {
      const data = await apiFetch<DeliveryOpsSnapshot>('/api/v1/delivery/ops');
      setOps(data);
    } catch {
      setOps(null);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const data = await apiFetch<DeliverySessionPublic[]>('/api/v1/delivery/sessions');
      setSessions(data);
      if (!selectedId && data[0]) setSelectedId(data[0].id);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      return [];
    }
  }, [selectedId]);

  useEffect(() => {
    void loadSessions();
    void loadOps();
    const interval = setInterval(() => {
      void loadSessions();
      void loadOps();
    }, 10_000);
    return () => clearInterval(interval);
  }, [loadSessions, loadOps]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setWaitingReply(false);
  };

  const startPollingForReply = (customerPhone: string, prevHistoryLen: number) => {
    stopPolling();
    setWaitingReply(true);
    let attempts = 0;

    pollRef.current = setInterval(async () => {
      attempts += 1;
      const data = await loadSessions();
      void loadOps();
      const session = data.find((s) => s.customerPhone === customerPhone);
      if (session) {
        setSelectedId(session.id);
        const assistantCount = session.conversationHistory.filter((m) => m.role === 'assistant').length;
        const userCount = session.conversationHistory.filter((m) => m.role === 'user').length;
        if (
          session.conversationHistory.length > prevHistoryLen &&
          assistantCount > 0 &&
          userCount >= Math.floor(prevHistoryLen / 2)
        ) {
          stopPolling();
          return;
        }
      }
      if (attempts >= 15) stopPolling();
    }, 2000);
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? message).trim();
    if (!msg) return;

    setSending(true);
    setError('');

    const sessionBefore = sessions.find((s) => s.customerPhone === phone);
    historyLenRef.current = sessionBefore?.conversationHistory.length ?? 0;

    try {
      await apiFetch<{ jobId: string; message: string }>('/api/v1/delivery/simulate', {
        method: 'POST',
        body: JSON.stringify({ phone, message: msg }),
      });
      setMessage('');
      await loadSessions();
      void loadOps();
      startPollingForReply(phone, historyLenRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Delivery IA — Simulador</h1>
        <p className="text-sm text-primary/50 mt-1">
          Prueba el asistente de WhatsApp sin Meta. Los mensajes pasan por BullMQ + IA (Gemini/OpenAI o fallback local).
        </p>
      </div>

      <OpsPanel ops={ops} />

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        <aside className="bg-surface border border-primary/10 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-primary/10 bg-primary/5">
            <p className="text-sm font-medium">Sesiones activas</p>
          </div>
          <ul className="overflow-y-auto flex-1 divide-y divide-primary/5">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-primary/5 ${
                    selected?.id === s.id ? 'bg-accent/20' : ''
                  }`}
                >
                  <p className="font-medium truncate">{s.customerPhone}</p>
                  <p className="text-xs text-primary/50">
                    {STATE_LABELS[s.state] ?? s.state} · {s.platform}
                  </p>
                </button>
              </li>
            ))}
            {sessions.length === 0 && (
              <li className="px-4 py-8 text-center text-primary/40 text-sm">Sin sesiones aún</li>
            )}
          </ul>
        </aside>

        <section className="lg:col-span-2 bg-surface border border-primary/10 rounded-xl flex flex-col min-h-[480px]">
          <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between">
            <div>
              <p className="font-medium">{phone}</p>
              {selected && (
                <p className="text-xs text-primary/50">
                  Estado: {STATE_LABELS[selected.state] ?? selected.state}
                  {selected.orderId && ` · Pedido ${selected.orderId.slice(-6)}`}
                </p>
              )}
            </div>
            {waitingReply && (
              <span className="text-xs text-amber-600 animate-pulse">Esperando respuesta IA…</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-primary/[0.02]">
            {(selected?.conversationHistory ?? []).map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-white border border-primary/10 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {(selected?.conversationHistory.length ?? 0) === 0 && (
              <p className="text-center text-primary/40 text-sm py-12">
                Enviá un mensaje para iniciar la conversación
              </p>
            )}
          </div>

          {selected?.currentOrderDraft && selected.currentOrderDraft.items.length > 0 && (
            <div className="px-4 py-2 border-t border-primary/10 bg-amber-50/50 text-xs">
              <span className="font-medium">Borrador:</span>{' '}
              {selected.currentOrderDraft.items.length} ítem(s)
              {selected.currentOrderDraft.customerAddress &&
                ` · ${selected.currentOrderDraft.customerAddress}`}
              {selected.currentOrderDraft.deliveryFee > 0 &&
                ` · Envío $${selected.currentOrderDraft.deliveryFee}`}
            </div>
          )}

          <div className="p-4 border-t border-primary/10 space-y-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_MESSAGES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={sending || waitingReply}
                  className="text-xs px-2 py-1 rounded-full bg-primary/5 hover:bg-primary/10 disabled:opacity-50"
                >
                  {q.length > 28 ? `${q.slice(0, 28)}…` : q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-40 px-3 py-2 border rounded-lg text-sm"
                placeholder="Teléfono"
              />
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Escribí como cliente…"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                disabled={sending}
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={sending || waitingReply || !message.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {sending ? '…' : 'Enviar'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
