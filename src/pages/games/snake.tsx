import { SnakeGame } from '../../games/snake/SnakeGame'

import { GamePage } from './GamePage'

export default function SnakePage () {
  return (
    <GamePage name='snake' sub='the classic, except this snake eats money. every $ makes it a little faster'>
      {burst => <SnakeGame onBurst={burst} />}
    </GamePage>
  )
}
