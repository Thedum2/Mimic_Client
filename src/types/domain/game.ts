export interface ParticipationInstructions {
  prefix: string
  highlight: string
  suffix: string
}

export interface ParticipationOption {
  value: string
  label: string
}

export type VictoryOptionId = 'lastOne' | 'smallGroup' | 'rounds'
