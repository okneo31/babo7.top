// WebRTC 다자 통화 (mesh). getUserMedia + RTCPeerConnection.
// 시그널링: socket join_call / new_caller / offer / answer / ice_candidate.
// TURN: turn:babo7.top:3478 babo/1234.

import { useEffect, useRef, useState } from 'react';
import type { TypedSocket } from '@/socket/socket';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:babo7.top:3478', username: 'babo', credential: '1234' },
  ],
};

export function CallView({ socket, onEnd }: { socket: TypedSocket; onEnd: () => void }) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const [remotes, setRemotes] = useState<{ uid: string; stream: MediaStream }[]>([]);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [ready, setReady] = useState(false);

  const addRemote = (uid: string, stream: MediaStream) => {
    setRemotes((prev) => {
      if (prev.some((r) => r.uid === uid)) return prev.map((r) => (r.uid === uid ? { uid, stream } : r));
      return [...prev, { uid, stream }];
    });
  };
  const removeRemote = (uid: string) => setRemotes((prev) => prev.filter((r) => r.uid !== uid));

  useEffect(() => {
    let cancelled = false;

    function createPC(uid: string): RTCPeerConnection {
      const existing = peersRef.current[uid];
      if (existing) return existing;
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current[uid] = pc;
      localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
      pc.ontrack = (e) => {
        if (e.streams[0]) addRemote(uid, e.streams[0]);
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('ice_candidate', { target: uid, candidate: e.candidate, sender: socket.id! });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          removeRemote(uid);
        }
      };
      return pc;
    }

    const onNewCaller = async (uid: string) => {
      const pc = createPC(uid);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { target: uid, sdp: offer, sender: socket.id! });
    };

    const onOffer = async (d: { sdp: unknown; sender: string }) => {
      const pc = createPC(d.sender);
      await pc.setRemoteDescription(new RTCSessionDescription(d.sdp as RTCSessionDescriptionInit));
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      socket.emit('answer', { target: d.sender, sdp: ans, sender: socket.id! });
    };

    const onAnswer = async (d: { sdp: unknown; sender: string }) => {
      const pc = peersRef.current[d.sender];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(d.sdp as RTCSessionDescriptionInit));
    };

    const onIce = async (d: { candidate: unknown; sender: string }) => {
      const pc = peersRef.current[d.sender];
      if (pc && d.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(d.candidate as RTCIceCandidateInit));
        } catch {
          /* ignore */
        }
      }
    };

    (async () => {
      try {
        // 보안 컨텍스트가 아니면 mediaDevices 자체가 없다(권한창도 안 뜸).
        if (!navigator.mediaDevices?.getUserMedia) {
          alert(
            '이 접속 환경에서는 카메라·마이크를 쓸 수 없습니다.\n\n' +
              'localhost 또는 https 로 접속해야 합니다. ' +
              '네트워크 IP(예: 121.x.x.x:5173)로 들어오면 브라우저가 차단합니다.\n' +
              `현재 주소: ${location.origin}`,
          );
          onEnd();
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setReady(true);

        socket.on('new_caller', onNewCaller);
        socket.on('offer', onOffer);
        socket.on('answer', onAnswer);
        socket.on('ice_candidate', onIce);
        socket.emit('join_call');
      } catch (e) {
        const err = e as DOMException;
        console.error('[call] getUserMedia 실패:', err.name, err.message);
        const msg =
          err.name === 'NotAllowedError'
            ? '카메라/마이크 권한이 거부된 상태입니다.\n주소창의 🔒(또는 ⓘ) → 카메라·마이크를 "허용"으로 바꾸고 새로고침하세요.'
            : err.name === 'NotFoundError'
              ? '카메라 또는 마이크 장치를 찾을 수 없습니다.'
              : err.name === 'NotReadableError'
                ? '카메라/마이크를 다른 앱이 사용 중입니다. 해당 앱을 끄고 다시 시도하세요.'
                : `카메라/마이크를 열 수 없습니다 (${err.name}).`;
        alert(msg);
        onEnd();
      }
    })();

    return () => {
      cancelled = true;
      socket.off('new_caller', onNewCaller);
      socket.off('offer', onOffer);
      socket.off('answer', onAnswer);
      socket.off('ice_candidate', onIce);
      Object.values(peersRef.current).forEach((pc) => pc.close());
      peersRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = muted; // 현재 muted면 켠다
      setMuted(!muted);
    }
  };
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = camOff;
      setCamOff(!camOff);
    }
  };

  return (
    <>
      <div className="bg-[#17212b] p-3 gap-3 overflow-x-auto h-48 shrink-0 border-b border-white/5 flex">
        <div className="relative h-full aspect-video bg-black rounded-xl overflow-hidden shrink-0 ring-2 ring-sky-500">
          <video ref={localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-md text-white text-xs font-bold">
            나{!ready && ' (연결 중…)'}
          </div>
        </div>
        {remotes.map((r) => (
          <RemoteVideo key={r.uid} stream={r.stream} />
        ))}
      </div>
      <div className="flex justify-center gap-8 py-4 bg-[#17212b] border-b border-white/5 shadow-lg shrink-0">
        <button
          onClick={toggleMute}
          className={`${muted ? 'btn-danger-soft' : 'btn-soft'} rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-sm`}
          title={muted ? '음소거 해제' : '음소거'}
        >
          🎤
        </button>
        <button
          onClick={toggleCam}
          className={`${camOff ? 'btn-danger-soft' : 'btn-soft'} rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-sm`}
          title={camOff ? '카메라 켜기' : '카메라 끄기'}
        >
          📷
        </button>
        <button
          onClick={onEnd}
          className="bg-red-500 text-white hover:bg-red-600 rounded-full w-14 h-14 flex items-center justify-center text-2xl shadow-md transition"
          title="통화 종료"
        >
          ✕
        </button>
      </div>
    </>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative h-full aspect-video bg-black rounded-xl overflow-hidden shrink-0 border border-white/10">
      <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />
    </div>
  );
}
