import Icon from '@/components/icons/Icon'

interface StartGameButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
}

export function StartGameButton({ onClick, disabled = false, label = '방 시작하기' }: StartGameButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-lg border border-amber-400 bg-amber-500/15 px-4 py-2 font-bold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon name="Play" size={18} />
      {label}
    </button>
  )
}
