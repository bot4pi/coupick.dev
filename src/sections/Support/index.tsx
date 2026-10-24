import { SectionHead } from '../../components'
import { BrandIcon, IconArrowUpRight, siTelegram } from '../../shared'

import { QrButton, Wallet, type WalletInfo } from './Wallet'

import './style.css'

// same wallets as on tele-wiki.org/developer
const EVM = '0x333056C542AA7Fe5D0fFF3b5c4e1474892d15E71'
const TRON = 'TF6sD397HcWpFSEie61pZuKXQsn6youdAb'

const coins: WalletInfo[] = [
  { name: 'ton', coin: 'ton', address: 'UQALjyxuxzPuiVRiLg1zXpMShgcKjVmre5j-Jd6IRjT_COUP', label: '…_COUP' },
  { name: 'btc', coin: 'btc', address: 'bc1q3cyqs6dhc4rynamc0rr6rkn28jmf68lcv860qt', label: 'bc1q…0qt' },
  { name: 'eth', coin: 'eth', address: EVM, label: '0x3330…' },
  { name: 'sol', coin: 'sol', address: 'EewZJfo2uX4SSRTeaqeFsr3BeHu5PVFuuAscceAE8MoB', label: 'EewZ…MoB' },
  { name: 'trx', coin: 'trx', address: TRON, label: 'TF6s…dAb' },
  { name: 'bnb', coin: 'bnb', address: EVM, label: '0x3330…' },
  { name: 'arb', coin: 'arb', address: EVM, label: '0x3330…' }
]

const stablecoins: WalletInfo[] = [
  { name: 'erc-20', coin: 'erc20', address: EVM, label: '0x3330…' },
  { name: 'trc-20', coin: 'trc20', address: TRON, label: 'TF6s…dAb' }
]

// a cryptobot invoice: pay with any coin without leaving telegram
const CRYPTOBOT = 'https://t.me/send?start=IVVutsYAXfim'

const WalletRow = ({ label, wallets }: { label: string, wallets: WalletInfo[] }) => (
  <div class='support-row'>
    <span class='support-row-label mono'>{label}</span>
    <div class='support-wallets'>
      {wallets.map(wallet => <Wallet key={wallet.name} wallet={wallet} />)}
    </div>
  </div>
)

export const SupportSection = () => (
  <section class='section container' id='support'>
    <SectionHead kicker='~/support' title='support'>
      i won't judge you if you skip this section. i'll just be a little sad
    </SectionHead>

    <div class='card support' data-reveal=''>
      <p class='support-text'>
        i've already mentioned that i love money, right? so if you <span class='muted'>for some reason</span> want
        to support me or the wiki's hosting, anything below works. <b>huge thanks in advance!</b>
      </p>

      <WalletRow label='crypto' wallets={coins} />
      <WalletRow label='usdt' wallets={stablecoins} />

      <div class='support-row'>
        <span class='support-row-label mono'>telegram</span>
        <div class='support-wallets'>
          <span class='wallet support-link-wrap'>
            <a class='support-link' href={CRYPTOBOT} target='_blank' rel='noopener noreferrer'>
              <BrandIcon icon={siTelegram} size='16px' />
              <span>cryptobot</span>
              <span class='wallet-label'>any coin, via @send</span>
              <IconArrowUpRight size='13px' />
            </a>

            <QrButton name='cryptobot' value={CRYPTOBOT} />
          </span>
        </div>
      </div>

      <p class='support-note'>
        click to copy. eth, bnb, arbitrum and usdt erc-20 share one address: just make sure the network in your
        wallet matches the one you picked here, or the money is gone. and i really don't like that
      </p>
    </div>
  </section>
)
