import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Square, Circle, Loader2, AlertCircle, CheckCircle, X, Clock } from 'lucide-react';
import type { RecordedAction } from '@/types';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

function authHeaders() {
  const token = localStorage.getItem('qa_token');
  return { Authorization: `Bearer ${token || ''}` };
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface RecorderWidgetProps {
  bugId: string;
  onRecordingDone?: (recordingId: string) => void;
}

export default function RecorderWidget({ bugId, onRecordingDone }: RecorderWidgetProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [minimised, setMinimised] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const actionsRef = useRef<RecordedAction[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const rrwebStopRef = useRef<(() => void) | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  // ── Start Recording ──────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setError(null);
    actionsRef.current = [];
    videoChunksRef.current = [];

    try {
      // 1. Register recording in backend
      const res = await fetch(`${API}/recordings/start`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ bug_id: bugId }),
      });
      if (!res.ok) throw new Error('Failed to start recording session');
      const { recording_id } = await res.json();
      setRecordingId(recording_id);

      // 2. Request screen capture
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      } catch {
        // Screen capture declined — record actions only
        toast('Screen capture declined. Recording actions only.', { icon: 'ℹ️' });
      }

      // 3. MediaRecorder for video
      if (stream) {
        const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        mr.ondataavailable = e => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
        mr.start(1000);
        mediaRecorderRef.current = mr;
      }

      // 4. rrweb action recording (dynamic import)
      try {
        const rrweb = await import('rrweb');
        const stopFn = rrweb.record({
          emit: (event: any) => {
            // Map rrweb events to simplified action schema using rrweb mirror
            const mapped = mapRrwebEvent(event, (rrweb as any).record?.mirror);
            if (mapped) actionsRef.current.push(mapped);
          },
          sampling: { mousemove: 200, input: 'last' },
        });
        rrwebStopRef.current = stopFn ?? null;
      } catch {
        toast('rrweb not available — recording clicks/inputs via DOM listeners', { icon: 'ℹ️' });
        attachDomListeners();
      }

      // 5. Start timer
      startTimeRef.current = Date.now();
      setState('recording');
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 1000);

    } catch (e: any) {
      setError(e.message || 'Failed to start recording');
      setState('error');
    }
  }, [bugId]);

  // ── DOM fallback listeners ────────────────────────────────────────────────
  const domListenerHandlers = useRef<{ type: string; fn: EventListener }[]>([]);

  const attachDomListeners = () => {
    const push = (action: RecordedAction) => actionsRef.current.push(action);

    const clickFn = (e: Event) => {
      const t = e.target as HTMLElement;
      push({ timestamp: Date.now() - startTimeRef.current, type: 'click', selector: getSelector(t) });
    };
    const inputFn = (e: Event) => {
      const t = e.target as HTMLInputElement;
      push({ timestamp: Date.now() - startTimeRef.current, type: 'fill', selector: getSelector(t), value: t.value });
    };
    document.addEventListener('click', clickFn, true);
    document.addEventListener('input', inputFn, true);
    domListenerHandlers.current = [
      { type: 'click', fn: clickFn },
      { type: 'input', fn: inputFn },
    ];
  };

  const detachDomListeners = () => {
    domListenerHandlers.current.forEach(({ type, fn }) => document.removeEventListener(type, fn, true));
    domListenerHandlers.current = [];
  };

  // ── Stop Recording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!recordingId) return;
    clearTimer();
    setState('processing');

    // Stop rrweb
    if (rrwebStopRef.current) { rrwebStopRef.current(); rrwebStopRef.current = null; }
    detachDomListeners();

    // Stop MediaRecorder and collect video
    let videoBlob: Blob | null = null;
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      await new Promise<void>(resolve => {
        mr.onstop = () => {
          videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          // Stop all tracks
          mr.stream.getTracks().forEach(t => t.stop());
          resolve();
        };
        mr.stop();
      });
    }
    mediaRecorderRef.current = null;

    // Send to backend
    try {
      const formData = new FormData();
      formData.append('actions', JSON.stringify(actionsRef.current));
      formData.append('duration_ms', String(elapsed));
      if (videoBlob) {
        formData.append('video', videoBlob, 'recording.webm');
      }

      const res = await fetch(`${API}/recordings/${recordingId}/stop`, {
        method: 'POST',
        headers: authHeaders(), // no Content-Type — let browser set multipart boundary
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to save recording');
      setState('done');
      toast.success('Recording saved!');
      onRecordingDone?.(recordingId);
    } catch (e: any) {
      setError(e.message || 'Failed to save recording');
      setState('error');
    }
  }, [recordingId, elapsed, onRecordingDone]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimer();
    if (rrwebStopRef.current) rrwebStopRef.current();
    detachDomListeners();
    mediaRecorderRef.current?.stream?.getTracks()?.forEach(t => t.stop());
  }, []);

  // ── rrweb event mapper ────────────────────────────────────────────────────
  function mapRrwebEvent(event: any, mirror?: any): RecordedAction | null {
    const now = Date.now() - startTimeRef.current;
    // rrweb event types: 0=DomContentLoaded, 1=Load, 2=FullSnapshot, 3=IncrementalSnapshot, 4=Meta, 5=Custom
    if (event.type === 5) {
      // Custom events (e.g. navigation)
      return { timestamp: now, type: 'navigate', url: event.data?.payload?.href || window.location.href };
    }
    if (event.type === 3) {
      const { source, data } = event.data;
      // source 2=MouseInteraction, 5=Input
      if (source === 2) {
        const typeMap: Record<number, string> = { 0: 'mouseup', 1: 'mousedown', 2: 'click', 3: 'contextmenu', 4: 'dblclick' };
        if (data.type === 2) { // click
          return { timestamp: now, type: 'click', selector: resolveSelector(data.id, mirror) };
        }
      }
      if (source === 5) {
        return {
          timestamp: now,
          type: 'fill',
          selector: resolveSelector(data.id, mirror),
          value: data.text || data.value || '',
        };
      }
    }
    return null;
  }

  function resolveSelector(id: number | undefined, mirror?: any): string {
    if (!id) return 'body';
    if (mirror) {
      try {
        const node = mirror.getNode(id);
        if (node && node instanceof HTMLElement) {
          return getSelector(node);
        }
      } catch (err) {
        console.warn('Error resolving selector from rrweb mirror:', err);
      }
    }
    return `[data-rrweb-id="${id}"]`;
  }

  function getSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    
    // Check for custom QA/Test attributes or standard attributes
    for (const attr of ['data-testid', 'data-qa', 'data-cy', 'name', 'placeholder']) {
      const val = el.getAttribute(attr);
      if (val) return `[${attr}="${val}"]`;
    }
    
    // Check if it's an anchor or button with text
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && el.innerText?.trim()) {
      const text = el.innerText.trim().substring(0, 30).replace(/"/g, '\\"');
      return `${el.tagName.toLowerCase()}:has-text("${text}")`;
    }
    
    // Safe class name extraction (skipping tailwind fractional or state classes)
    if (el.className && typeof el.className === 'string') {
      const classes = el.className
        .split(/\s+/)
        .filter(c => c && !c.includes(':') && !c.includes('/') && !c.includes('[') && !c.includes(']'));
      if (classes.length > 0) {
        return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
      }
    }
    
    return el.tagName.toLowerCase();
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={`fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-xl border rounded-2xl shadow-2xl shadow-black/50 transition-all ${
          state === 'recording' ? 'border-red-500/60' : 'border-slate-700/60'
        } ${minimised ? 'w-14 h-14' : 'w-72'}`}
      >
        {minimised ? (
          <button
            onClick={() => setMinimised(false)}
            className={`w-full h-full flex items-center justify-center rounded-2xl ${
              state === 'recording' ? 'bg-red-500/20' : ''
            }`}
          >
            {state === 'recording' ? (
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                <Circle size={20} className="text-red-400 fill-red-400" />
              </motion.div>
            ) : (
              <Video size={20} className="text-violet-400" />
            )}
          </button>
        ) : (
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video size={16} className="text-violet-400" />
                <span className="text-sm font-semibold text-white">Session Recorder</span>
              </div>
              <div className="flex items-center gap-1">
                {state === 'recording' && (
                  <button onClick={() => setMinimised(true)} className="text-slate-500 hover:text-white p-1 transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Status indicator */}
            {state === 'recording' && (
              <div className="flex items-center gap-2 mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Circle size={8} className="text-red-400 fill-red-400" />
                </motion.div>
                <span className="text-red-400 text-sm font-semibold">Recording</span>
                <span className="ml-auto text-red-400/80 text-sm font-mono">{formatTime(elapsed)}</span>
              </div>
            )}

            {state === 'processing' && (
              <div className="flex items-center gap-2 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2">
                <Loader2 size={13} className="text-amber-400 animate-spin" />
                <span className="text-amber-400 text-sm">Processing…</span>
              </div>
            )}

            {state === 'done' && (
              <div className="flex items-center gap-2 mb-3 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2">
                <CheckCircle size={13} className="text-green-400" />
                <span className="text-green-400 text-sm">Saved! Check Recording tab.</span>
              </div>
            )}

            {state === 'error' && (
              <div className="flex items-center gap-2 mb-3 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                <AlertCircle size={13} className="text-red-400" />
                <span className="text-red-400 text-xs truncate">{error}</span>
              </div>
            )}

            {/* Actions count */}
            {state === 'recording' && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                <Clock size={11} />
                <span>{actionsRef.current.length} actions captured</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              {state === 'idle' || state === 'done' || state === 'error' ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-sm font-semibold transition-colors"
                >
                  <Circle size={13} className="fill-red-400" />
                  {state === 'done' || state === 'error' ? 'Record Again' : 'Start Recording'}
                </motion.button>
              ) : state === 'recording' ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white text-sm font-semibold transition-colors"
                >
                  <Square size={13} className="fill-white" />
                  Stop Recording
                </motion.button>
              ) : (
                <div className="flex-1 flex items-center justify-center py-2.5 text-slate-500 text-sm">
                  <Loader2 size={15} className="animate-spin mr-2" /> Processing…
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
