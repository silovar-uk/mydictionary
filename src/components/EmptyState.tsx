import type { ReactNode } from 'react'

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty-state paper-panel">
      <div className="empty-state__mark">辞</div>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}
