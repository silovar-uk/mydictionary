import { useEffect, useState } from 'react'

export const ROUTES = ['today', 'dictionary', 'add', 'open', 'data'] as const
export type Route = (typeof ROUTES)[number]

export function getRoute(): Route {
  const route = window.location.hash.replace(/^#\/?/, '').split('/')[0]
  return ROUTES.includes(route as Route) ? (route as Route) : 'today'
}

export function navigate(route: Route): void {
  window.location.hash = `/${route}`
}

export function useRoute(): Route {
  const [route, setRoute] = useState(getRoute)
  useEffect(() => {
    if (!window.location.hash) navigate('today')
    const handler = () => setRoute(getRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return route
}
