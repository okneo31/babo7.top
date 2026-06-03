// #9 사라지는 메시지 만료초 선택. send_message의 expireSeconds로 전달.

const OPTIONS: { label: string; value: number }[] = [
  { label: '끔', value: 0 },
  { label: '10초', value: 10 },
  { label: '1분', value: 60 },
  { label: '1시간', value: 3600 },
  { label: '1일', value: 86400 },
];

export function DisappearingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (seconds: number) => void;
}) {
  const active = value > 0;
  return (
    <div className="flex items-center" title="사라지는 메시지">
      <span className={`text-base mr-1 ${active ? 'text-amber-400' : 'text-[#7f91a4]'}`}>⏲️</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`bg-[#242f3d] text-[11px] px-1.5 py-2 rounded-lg outline-none font-bold cursor-pointer ${
          active ? 'text-amber-300' : 'text-white'
        }`}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
