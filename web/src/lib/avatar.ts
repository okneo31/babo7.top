// legacy의 아바타 헬퍼 이식. 닉네임/방ID 해시 → 그라데이션 색상.

const AVATAR_COLORS = [
  'from-red-500 to-pink-600',
  'from-orange-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-fuchsia-500 to-pink-500',
];

/** 이름 기반 결정적 그라데이션 색상 (Tailwind from/to 클래스). */
export function getAvatarColor(name: string): string {
  const n = name || '?';
  let hash = 0;
  for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 이니셜 (대문자 1글자). */
export function getInitial(name: string): string {
  return (name || '?').charAt(0).toUpperCase();
}

/** HH:MM 시간 포맷. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** 날짜 + 시간 포맷. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
