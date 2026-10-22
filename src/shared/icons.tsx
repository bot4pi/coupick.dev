import type { ComponentChildren } from 'preact'

// `icon` is a 24x24 svg path, see ./brands.ts
export const BrandIcon = ({ icon, size = '1em', color = 'currentColor' }: { icon: string, size?: string, color?: string }) => (
  <svg viewBox='0 0 24 24' width={size} height={size} fill={color} aria-hidden='true'>
    <path d={icon} />
  </svg>
)

interface IconProps {
  size?: string
}

const Stroke = ({ size = '1em', children, width = 2 }: IconProps & { children: ComponentChildren, width?: number }) => (
  <svg viewBox='0 0 24 24' width={size} height={size} fill='none' stroke='currentColor' stroke-width={width} stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>
    {children}
  </svg>
)

export const IconLock = ({ size }: IconProps) => (
  <Stroke size={size} width={1.8}>
    <rect x='5' y='11' width='14' height='9' rx='2' />
    <path d='M8 11V8a4 4 0 0 1 8 0v3' />
  </Stroke>
)

export const IconCopy = ({ size }: IconProps) => (
  <Stroke size={size} width={1.8}>
    <rect x='9' y='9' width='11' height='11' rx='2.5' />
    <path d='M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15' />
  </Stroke>
)

export const IconCheck = ({ size }: IconProps) => (
  <Stroke size={size} width={2.4}>
    <path d='M5 12.5l4.5 4.5L19 7.5' />
  </Stroke>
)

export const IconQrCode = ({ size }: IconProps) => (
  <Stroke size={size} width={1.8}>
    <rect x='4' y='4' width='6' height='6' rx='1' />
    <rect x='14' y='4' width='6' height='6' rx='1' />
    <rect x='4' y='14' width='6' height='6' rx='1' />
    <path d='M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2' />
  </Stroke>
)

export const IconArrowLeft = ({ size }: IconProps) => (
  <Stroke size={size}>
    <path d='M19 12H5' />
    <path d='M11 6l-6 6 6 6' />
  </Stroke>
)

export const IconPlay = ({ size = '1em' }: IconProps) => (
  <svg viewBox='0 0 24 24' width={size} height={size} fill='currentColor' aria-hidden='true'>
    <path d='M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z' />
  </svg>
)

export const IconPause = ({ size = '1em' }: IconProps) => (
  <svg viewBox='0 0 24 24' width={size} height={size} fill='currentColor' aria-hidden='true'>
    <rect x='6' y='5' width='4' height='14' rx='1' />
    <rect x='14' y='5' width='4' height='14' rx='1' />
  </svg>
)

export const IconArrowUpRight = ({ size }: IconProps) => (
  <Stroke size={size}>
    <path d='M7 17L17 7' />
    <path d='M8 7h9v9' />
  </Stroke>
)

export const IconArrowRight = ({ size }: IconProps) => (
  <Stroke size={size}>
    <path d='M5 12h14' />
    <path d='M13 6l6 6-6 6' />
  </Stroke>
)

export const IconReplay = ({ size }: IconProps) => (
  <Stroke size={size}>
    <path d='M4 12a8 8 0 1 0 2.4-5.7' />
    <path d='M4 4v4.5h4.5' />
  </Stroke>
)

// two streams going both ways: stands in for mtproto, which has no logo of its own
export const IconProtocol = ({ size }: IconProps) => (
  <Stroke size={size}>
    <path d='M4 8h14' />
    <path d='M15 5l3 3-3 3' />
    <path d='M20 16H6' />
    <path d='M9 13l-3 3 3 3' />
  </Stroke>
)
