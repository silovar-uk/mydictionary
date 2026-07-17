import type { ReactNode, SVGProps } from 'react'

type IconName = 'home' | 'book' | 'plus' | 'shuffle' | 'database' | 'search' | 'close' | 'star' | 'edit' | 'trash' | 'arrow' | 'download' | 'upload' | 'clock'

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></>,
    book: <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22Z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22Z"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    shuffle: <><path d="M16 3h5v5"/><path d="m21 3-6.5 6.5a3 3 0 0 1-4.2 0L3 2.5"/><path d="M16 16h5v5"/><path d="m21 21-6.5-6.5a3 3 0 0 0-4.2 0L3 21.5"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    close: <><path d="M5 5l14 14"/><path d="M19 5 5 19"/></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></>,
    trash: <><path d="M4 7h16"/><path d="M9 3h6l1 4H8Z"/><path d="m7 7 1 14h8l1-14"/></>,
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 20h16"/></>,
    upload: <><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M4 4h16"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}
