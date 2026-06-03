// 공용 유틸 — 가장 중요한 것: 유니코드 NFC 정규화.
// legacy 버그 교훈: iOS/macOS의 NFD 입력과 DB의 NFC 저장이 어긋나면 닉네임 매칭이 깨진다.
// 모든 신원/매칭 텍스트(username, nickname, friendId 등)는 입력 경계에서 nfc()를 통과시킨다.

export const nfc = (s: unknown): string =>
  typeof s === 'string' ? s.normalize('NFC') : '';

/** @멘션 추출 (#3). 한글/영문/숫자/_ 허용. 반환은 NFC 정규화된 닉네임 후보 배열. */
export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  const re = /@([\p{L}\p{N}_]{1,30})/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.add(nfc(m[1]));
  return [...out];
}

/** 답장/목록용 텍스트 미리보기 자르기 */
export const preview = (text: string, n = 60): string =>
  (text || '').replace(/\s+/g, ' ').slice(0, n);
