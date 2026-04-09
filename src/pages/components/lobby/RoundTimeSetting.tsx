import Icon from "@/components/icons/Icon";

interface RoundTimeSettingProps {
  value: number;
  onChange: (next: number) => void;
}

const presets = [15, 30, 45, 60, 90];

export function RoundTimeSetting({
  value,
  onChange,
}: RoundTimeSettingProps) {
  return (
    <section className="rounded-[18px] border border-white/12 bg-black/25 px-4 py-3">
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap">
        <div className="flex shrink-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
            <Icon name="Clock" size={18} />
          </span>
          <p className="text-sm font-bold text-white">라운드 진행 시간</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                preset === value
                  ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                  : "border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]"
              }`}
            >
              {preset}초
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
