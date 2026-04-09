import Icon from '@/components/icons/Icon'

export type PlatformName = 'soop' | 'chzzk' | 'youtube'

export function getRandomPlatform(seed: string): PlatformName {
  const value = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const platforms: PlatformName[] = ['soop', 'chzzk', 'youtube']
  return platforms[value % platforms.length]
}

export function PlatformIcon({ platform, size = 40 }: { platform: PlatformName; size?: number }) {
  const iconName = platform === 'soop' ? 'Tv' : platform === 'chzzk' ? 'RadioTower' : 'Video'

  return <Icon name={iconName} size={size} />
}
