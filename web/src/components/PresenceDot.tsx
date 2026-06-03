// #5 온라인 표시 점.

export function PresenceDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ring-2 ring-[var(--tg-sidebar)] ${
        online ? 'bg-emerald-400' : 'bg-gray-500'
      }`}
      title={online ? '온라인' : '오프라인'}
    />
  );
}
