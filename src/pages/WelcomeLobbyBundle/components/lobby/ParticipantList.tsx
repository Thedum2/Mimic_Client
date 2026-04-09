import type { ParticipantListItem } from "@/types/domain/participant";

interface ParticipantListProps {
  title: string;
  participants: ParticipantListItem[];
  capacity: number;
}

export function ParticipantList({
  title,
  participants,
  capacity,
}: ParticipantListProps) {
  return (
    <section className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[24px] border border-white/20 bg-black/35 p-4 backdrop-blur-md">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{title}</h2>
        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/15 px-3 py-1 text-sm text-yellow-100">
          {participants.length}/{capacity}
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid gap-2">
          {participants.map((participant) => (
            <article
              key={participant.id}
              className="flex h-14 items-center gap-3 rounded-lg border border-white/20 bg-white/[0.06] px-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-bold text-white">
                {participant.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {participant.name}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
