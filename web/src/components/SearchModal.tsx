// 방내 메시지 검색. POST /api/messages/search.

import { useState } from 'react';
import type { Message } from '@babotalk/shared';
import { api } from '@/api/client';
import { formatDateTime } from '@/lib/avatar';
import { ModalShell } from './CreateRoomModal';

export function SearchModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Message[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!keyword.trim()) return;
    setBusy(true);
    try {
      const res = await api.searchMessages({ roomId, keyword: keyword.trim() });
      setResults(res);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '검색 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="대화 내용 검색">
      <div className="flex gap-2 mb-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void search();
          }}
          placeholder="키워드 입력..."
          className="input-style bg-[#0e1621] flex-1"
        />
        <button onClick={() => void search()} disabled={busy} className="btn-primary bg-sky-500 text-white w-auto px-5 py-2">
          검색
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 text-sm pr-1 min-h-[120px]">
        {results !== null && results.length === 0 && (
          <p className="text-[#7f91a4] text-center mt-8">검색 결과가 없습니다.</p>
        )}
        {results?.map((m) => (
          <div key={m._id} className="bg-[#0e1621] p-3.5 rounded-xl border border-white/5">
            <div className="text-xs text-sky-400 font-bold mb-1.5 flex justify-between">
              <span>{m.user}</span>
              <span className="text-[#7f91a4] font-normal">{formatDateTime(m.createdAt)}</span>
            </div>
            <div className="text-[14px] text-white break-words">{m.text || '(첨부 파일)'}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}
