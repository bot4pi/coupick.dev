import { BlockBlastGame } from '../../games/blockblast/BlockBlastGame'

import { GamePage } from './GamePage'

export default function BlockBlastPage () {
  return (
    <GamePage name='blockblast' sub='fill rows and columns to clear them. like the app, minus the ads every 30 seconds' ratio={1.42}>
      {burst => <BlockBlastGame onBurst={burst} />}
    </GamePage>
  )
}
