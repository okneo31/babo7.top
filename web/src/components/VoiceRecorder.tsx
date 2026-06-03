// #6 음성 메시지. MediaRecorder 녹음 → 업로드(type=voice, duration) → onSend(file).

import { useRef, useState } from 'react';
import type { FileMeta } from '@babotalk/shared';
import { uploadFile } from '@/api/files';

export function VoiceRecorder({ onSend }: { onSend: (file: FileMeta) => void }) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanup = () => {
    stopTimer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 250);
    } catch {
      alert('🎤 마이크 권한이 필요합니다.');
    }
  };

  const stopAndSend = async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    const duration = (Date.now() - startedAtRef.current) / 1000;
    stopTimer();
    setRecording(false);
    setBusy(true);
    const blob: Blob = await new Promise((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' }));
      rec.stop();
    });
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try {
      const name = `voice-${Date.now()}.webm`;
      const file = await uploadFile(blob, name, { type: blob.type || 'audio/webm', duration });
      onSend(file);
    } catch (e) {
      alert('🚨 음성 전송 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'));
    } finally {
      setBusy(false);
      cleanup();
    }
  };

  const cancel = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.onstop = () => cleanup();
      rec.stop();
    } else {
      cleanup();
    }
  };

  if (busy) {
    return (
      <div className="text-sky-400 text-xs px-2 py-2.5 shrink-0 animate-pulse" title="전송 중">
        전송…
      </div>
    );
  }

  if (recording) {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-red-400 text-xs font-mono flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          {m}:{String(s).padStart(2, '0')}
        </span>
        <button onClick={cancel} className="text-[#7f91a4] hover:text-white p-1" title="녹음 취소">
          ✕
        </button>
        <button
          onClick={stopAndSend}
          className="bg-sky-500 hover:bg-sky-400 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-md"
          title="녹음 전송"
        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className="text-[#7f91a4] hover:text-sky-400 p-2.5 rounded-full transition shrink-0"
      title="음성 메시지"
    >
      🎤
    </button>
  );
}
