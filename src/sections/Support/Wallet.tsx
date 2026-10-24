import { useEffect, useRef, useState } from 'preact/hooks'

import { IconCheck, IconCopy, IconQrCode } from '../../shared'

export interface WalletInfo {
  name: string
  coin: string
  address: string
  // what to show on the chip instead of the whole address
  label: string
}

// the qr encoder is only needed once someone opens a code, so it's loaded on demand
const Qr = ({ value }: { value: string }) => {
  const [cells, setCells] = useState<{ count: number, path: string } | null>(null)

  useEffect(() => {
    let cancelled = false

    import('qrcode-generator').then(({ default: qrcode }) => {
      const qr = qrcode(0, 'M')

      qr.addData(value)
      qr.make()

      const count = qr.getModuleCount()
      let path = ''

      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          if (qr.isDark(row, col)) {
            path += `M${col} ${row}h1v1h-1z`
          }
        }
      }

      if (!cancelled) {
        setCells({ count, path })
      }
    })

    return () => {
      cancelled = true
    }
  }, [value])

  if (cells === null) {
    return <span class='wallet-qr wallet-qr-loading' />
  }

  return (
    <svg
      class='wallet-qr'
      viewBox={`-2 -2 ${cells.count + 4} ${cells.count + 4}`}
      shape-rendering='crispEdges'
      role='img'
      aria-label='qr code'
    >
      <rect x='-2' y='-2' width={cells.count + 4} height={cells.count + 4} fill='#f5f5f5' />
      <path d={cells.path} fill='#161616' />
    </svg>
  )
}

/**
 * The little qr button next to a chip, and the code it pops open under it. It sits inside a positioned
 * `.wallet` so the popover lines up with the chip; pointing anywhere else or escape closes it.
 */
export const QrButton = ({ name, value }: { name: string, value: string }) => {
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (!button.current?.contains(target) && !popover.current?.contains(target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={button}
        type='button'
        class={`wallet-qr-toggle${open ? ' wallet-qr-toggle-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'hide qr code' : `show ${name} qr code`}
        aria-expanded={open}
      >
        <IconQrCode size='14px' />
      </button>

      {open && (
        <span ref={popover} class='wallet-qr-popover' role='dialog' aria-label={`${name} qr code`}>
          <Qr value={value} />
          <span class='wallet-qr-label'>{name}</span>
        </span>
      )}
    </>
  )
}

export const Wallet = ({ wallet }: { wallet: WalletInfo }) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }

    const timer = setTimeout(() => setCopied(false), 1800)

    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(wallet.address)
      setCopied(true)
    } catch {
      // no clipboard access: the address is still in the tooltip and the qr
    }
  }

  return (
    <span class='wallet'>
      <button
        type='button'
        class={`wallet-chip with-note${copied ? ' wallet-chip-copied' : ''}`}
        data-note={copied ? 'copied!' : wallet.address}
        onClick={copy}
        aria-label={`copy ${wallet.name} address`}
      >
        <img class='wallet-coin' src={`/coins/${wallet.coin}.svg`} alt='' width={16} height={16} />
        <span>{wallet.name}</span>
        <span class='wallet-label'>{wallet.label}</span>
        {copied ? <IconCheck size='13px' /> : <IconCopy size='13px' />}
      </button>

      <QrButton name={wallet.name} value={wallet.address} />
    </span>
  )
}
