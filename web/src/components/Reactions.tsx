// #4 반응. 이모지 토글 바 + 기존 반응 카운트 표시.

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export function ReactionPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="flex gap-0.5 bg-[#222] rounded-full px-1.5 py-1 shadow-lg border border-white/10">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="text-base hover:scale-125 transition-transform px-1"
          title={`${e} 반응`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export function ReactionBar({
  reactions,
  myNick,
  onToggle,
}: {
  reactions: Record<string, string[]> | undefined;
  myNick: string;
  onToggle: (emoji: string) => void;
}) {
  if (!reactions) return null;
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const mine = users.includes(myNick);
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            title={users.join(', ')}
            className={`text-xs px-2 py-0.5 rounded-full border transition flex items-center gap-1 ${
              mine
                ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                : 'bg-black/20 border-white/10 text-gray-300 hover:bg-black/30'
            }`}
          >
            <span>{emoji}</span>
            <span className="font-bold">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}
