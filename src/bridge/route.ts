export function buildRoute(route: string, action?: string) {
  return action ? `${route}_${action}` : route
}

export function parseRoute(fullRoute: string) {
  const [routeName, ...actionParts] = fullRoute.split('_')

  return {
    routeName,
    action: actionParts.join('_'),
  }
}
