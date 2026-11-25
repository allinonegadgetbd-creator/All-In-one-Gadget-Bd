export function getBasePath(): string {
  const raw = import.meta.env.BASE_URL || '/';
  return raw.endsWith('/') ? raw : `${raw}/`;
}

export function assetUrl(url: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const base = getBasePath();
  if (url.startsWith(base)) return url;
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return `${base}${clean}`;
}

export function routeUrl(route: string): string {
  const base = getBasePath();
  if (!route || route === '/') return base;
  if (route.startsWith('#')) return `${base}${route}`;
  const clean = route.startsWith('/') ? route.slice(1) : route;
  return `${base}${clean}`;
}

export function stripBase(pathname: string): string {
  const base = getBasePath();
  if (base === '/') return pathname || '/';
  const baseNoTrail = base.slice(0, -1);
  if (pathname === baseNoTrail || pathname === base) return '/';
  if (pathname.startsWith(base)) {
    return '/' + pathname.slice(base.length);
  }
  if (pathname.startsWith(baseNoTrail + '/')) {
    return pathname.slice(baseNoTrail.length);
  }
  return pathname || '/';
}
