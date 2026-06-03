// #3 @멘션 하이라이트. 텍스트 내 @닉네임을 강조 표시.

import React from 'react';

const MENTION_RE = /(@[\p{L}\p{N}_]{1,30})/gu;

export function MentionText({ text, myNick }: { text: string; myNick?: string }) {
  if (!text) return null;
  const parts = text.split(MENTION_RE);
  return (
    <span className="text-[15px] whitespace-pre-wrap break-words">
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const name = part.slice(1);
          const isMe = myNick && name.normalize('NFC') === myNick.normalize('NFC');
          return (
            <span
              key={i}
              className={isMe ? 'text-amber-300 font-bold bg-amber-400/10 rounded px-0.5' : 'text-sky-300 font-semibold'}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
