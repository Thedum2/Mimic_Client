import { useMemo } from 'react'

import Icon from '@/components/icons/Icon'

export interface CharacterProfile {
  name: string
  image: string
  title?: string
}

interface CharacterProfileCardProps {
  profile: CharacterProfile
  onNext: () => void
}

export function CharacterProfileCard({ profile, onNext }: CharacterProfileCardProps) {
  const cardShellClass =
    'background-stripes parallax-effect-glare-scale rounded-2xl bg-gradient-to-b from-neutral-900/75 to-neutral-900/35 shadow-lg border border-white/20 overflow-hidden'

  const title = useMemo(() => {
    return profile.title ?? '기본 프로필'
  }, [profile.title])

  return (
    <section className={`relative flex h-[285px] w-[100%] flex-col ${cardShellClass} p-2`}>
      <div className="relative z-10 flex flex-1 flex-col gap-3 rounded-2xl border border-white/5 bg-black/20 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">캐릭터 미리보기</p>
        <div className="relative mx-auto flex w-full flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-black/25 p-3">
          <img
            src={profile.image}
            alt={profile.name}
            className="h-full w-full max-h-40 object-cover object-top"
          />
          <button
            type="button"
            onClick={onNext}
            className="absolute right-3 bottom-3 flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/90"
          >
            <Icon name="RefreshCw" type="lucide" size={14} />
            캐릭터 변경
          </button>
        </div>
        <div className="mt-1">
          <h3 className="text-2xl font-bold text-white">{profile.name}</h3>
          <p className="text-sm text-white/75">{title}</p>
        </div>
      </div>
    </section>
  )
}

