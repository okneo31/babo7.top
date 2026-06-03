// #5 타이핑 인디케이터. 현재 입력 중인 닉네임 목록 표시.

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} 님이 입력 중`
      : names.length === 2
        ? `${names[0]}, ${names[1]} 님이 입력 중`
        : `${names.length}명이 입력 중`;
  return (
    <div className="px-4 py-1 text-[12px] text-sky-400 flex items-center gap-1.5">
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" />
      </span>
      {label}…
    </div>
  );
}
