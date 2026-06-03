// #3 답장 인용 미리보기(메시지 버블 내부) + 컴포저 상단 답장 바.

import type { ReplyRef } from '@babotalk/shared';

/** 메시지 버블 내부에 표시되는 인용 스냅샷. */
export function ReplyQuote({ replyTo }: { replyTo: ReplyRef }) {
  return (
    <div className="mb-1.5 pl-2 border-l-2 border-sky-400/70 bg-black/20 rounded-r-md py-1 pr-2">
      <div className="text-[11px] text-sky-300 font-bold truncate">{replyTo.user}</div>
      <div className="text-[12px] text-white/70 truncate">{replyTo.text || '첨부 파일'}</div>
    </div>
  );
}

/** 입력창 위에 표시되는 답장 컴포저 바 (#3). */
export function ReplyComposer({ target, onCancel }: { target: ReplyRef; onCancel: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#0e1621] border-t border-white/5">
      <div className="w-1 self-stretch bg-sky-400 rounded-full" />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-sky-300 font-bold truncate">{target.user} 님에게 답장</div>
        <div className="text-[12px] text-white/60 truncate">{target.text || '첨부 파일'}</div>
      </div>
      <button onClick={onCancel} className="text-[#7f91a4] hover:text-white text-lg px-1 shrink-0" title="답장 취소">
        ✕
      </button>
    </div>
  );
}
