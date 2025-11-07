import type { GameEnvironment } from '../types'

export const defaultEnvironment: GameEnvironment = {
  id: 'damareen-core',
  name: 'Damareen Alapkor',
  worldCards: [
    {
      id: 'aragorn',
      name: 'Aragorn',
      damage: 2,
      health: 5,
      element: 'fire',
      kind: 'standard',
    },
    {
      id: 'galadriel',
      name: 'Galadriel',
      damage: 3,
      health: 4,
      element: 'air',
      kind: 'standard',
    },
    {
      id: 'durin',
      name: 'Durin',
      damage: 4,
      health: 6,
      element: 'earth',
      kind: 'standard',
    },
    {
      id: 'melian',
      name: 'Melian',
      damage: 2,
      health: 3,
      element: 'water',
      kind: 'standard',
    },
    {
      id: 'eldarion',
      name: 'Eldarion',
      damage: 3,
      health: 6,
      element: 'earth',
      kind: 'standard',
    },
    {
      id: 'darth-obiw',
      name: 'Darth ObiWan',
      damage: 4,
      health: 2,
      element: 'fire',
      kind: 'leader',
      sourceCardId: 'melian',
    },
  ],
  starterCollection: ['aragorn', 'galadriel', 'melian', 'eldarion'],
  dungeons: [
    {
      id: 'enc-embers',
  name: 'Parazslo Tamas',
      type: 'encounter',
      cardOrder: ['melian'],
    },
    {
      id: 'minor-depths',
  name: 'A Kristalysator',
      type: 'minor',
      cardOrder: ['aragorn', 'melian', 'galadriel', 'darth-obiw'],
    },
    {
      id: 'major-queen',
  name: 'A Melyseg Kiralynoje',
      type: 'major',
  cardOrder: ['durin', 'melian', 'galadriel', 'aragorn', 'eldarion', 'darth-obiw'],
    },
  ],
}
