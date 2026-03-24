import * as Linking from 'expo-linking';

export const DEEP_LINK_SCHEME = 'rork-app';
export const UNIVERSAL_LINK_DOMAIN = 'rork.com';

export interface DeepLinkRoute {
  screen: string;
  params?: Record<string, string>;
}

export interface HomeDeepLinkParams {
  homeId: string;
  roomId?: string;
  action?: 'view' | 'visit' | 'edit';
  multiplayer?: boolean;
}

export const HOME_ROUTES = {
  BROWSER: '/home-browser',
  DETAIL: '/home-detail',
  EDITOR: '/home-editor',
  CREATION: '/home-creation',
  VISIT: '/home-visit',
  LOBBY: '/home-lobby',
  ENVIRONMENT_3D: '/home-3d-environment',
} as const;

export function parseHomeDeepLink(url: string): HomeDeepLinkParams | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path || '';
    const pathSegments = path.split('/').filter(Boolean);

    console.log('[DeepLink] Parsing URL:', url);
    console.log('[DeepLink] Path segments:', pathSegments);

    if (pathSegments[0] === 'home' || pathSegments[0] === 'home-detail') {
      const homeId = pathSegments[1] || parsed.queryParams?.id as string;
      
      if (!homeId) {
        console.log('[DeepLink] No home ID found');
        return null;
      }

      const params: HomeDeepLinkParams = { homeId };

      if (pathSegments[2] === 'visit' || parsed.queryParams?.action === 'visit') {
        params.action = 'visit';
      } else if (pathSegments[2] === 'edit' || parsed.queryParams?.action === 'edit') {
        params.action = 'edit';
      } else {
        params.action = 'view';
      }

      if (pathSegments[2] === 'room' && pathSegments[3]) {
        params.roomId = pathSegments[3];
      } else if (parsed.queryParams?.roomId) {
        params.roomId = parsed.queryParams.roomId as string;
      }

      if (parsed.queryParams?.multiplayer === 'true') {
        params.multiplayer = true;
      }

      console.log('[DeepLink] Parsed params:', params);
      return params;
    }

    if (pathSegments[0] === 'home-visit') {
      const homeId = pathSegments[1] || parsed.queryParams?.id as string;
      if (homeId) {
        return {
          homeId,
          action: 'visit',
          multiplayer: parsed.queryParams?.multiplayer === 'true',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[DeepLink] Error parsing URL:', error);
    return null;
  }
}

export function createHomeDeepLink(params: HomeDeepLinkParams): string {
  const { homeId, roomId, action, multiplayer } = params;
  
  let path = `home/${homeId}`;
  
  if (action === 'visit') {
    path += '/visit';
  } else if (action === 'edit') {
    path += '/edit';
  }
  
  if (roomId && action !== 'visit' && action !== 'edit') {
    path += `/room/${roomId}`;
  }

  const queryParams: string[] = [];
  if (multiplayer) {
    queryParams.push('multiplayer=true');
  }
  if (roomId && (action === 'visit' || action === 'edit')) {
    queryParams.push(`roomId=${roomId}`);
  }

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  
  return Linking.createURL(path + queryString);
}

export function createUniversalLink(params: HomeDeepLinkParams): string {
  const { homeId, roomId, action, multiplayer } = params;
  
  let path = `/home/${homeId}`;
  
  if (action === 'visit') {
    path += '/visit';
  } else if (roomId) {
    path += `/room/${roomId}`;
  }

  const queryParams: string[] = [];
  if (multiplayer) {
    queryParams.push('multiplayer=true');
  }

  const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
  
  return `https://${UNIVERSAL_LINK_DOMAIN}${path}${queryString}`;
}

export function getRouteFromDeepLink(params: HomeDeepLinkParams): DeepLinkRoute {
  const { homeId, roomId, action, multiplayer } = params;

  const routeParams: Record<string, string> = { id: homeId };
  if (roomId) routeParams.roomId = roomId;
  if (multiplayer) routeParams.multiplayer = 'true';

  switch (action) {
    case 'visit':
      return {
        screen: HOME_ROUTES.VISIT,
        params: routeParams,
      };
    case 'edit':
      return {
        screen: HOME_ROUTES.EDITOR,
        params: routeParams,
      };
    default:
      return {
        screen: HOME_ROUTES.DETAIL,
        params: routeParams,
      };
  }
}

export async function openHomeInExternalApp(params: HomeDeepLinkParams): Promise<boolean> {
  try {
    const url = createHomeDeepLink(params);
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    
    console.log('[DeepLink] Cannot open URL:', url);
    return false;
  } catch (error) {
    console.error('[DeepLink] Error opening URL:', error);
    return false;
  }
}

export function getShareableHomeLink(homeId: string, roomId?: string): {
  deepLink: string;
  universalLink: string;
  shareText: string;
} {
  const params: HomeDeepLinkParams = { homeId, roomId, action: 'view' };
  
  const deepLink = createHomeDeepLink(params);
  const universalLink = createUniversalLink(params);
  
  const shareText = roomId
    ? `Check out this room in my virtual home!`
    : `Check out my virtual home!`;

  return {
    deepLink,
    universalLink,
    shareText,
  };
}

export function getVisitHomeLink(homeId: string, multiplayer = false): {
  deepLink: string;
  universalLink: string;
  shareText: string;
} {
  const params: HomeDeepLinkParams = { homeId, action: 'visit', multiplayer };
  
  const deepLink = createHomeDeepLink(params);
  const universalLink = createUniversalLink(params);
  
  const shareText = multiplayer
    ? `Join me for a virtual home tour!`
    : `Come visit my virtual home!`;

  return {
    deepLink,
    universalLink,
    shareText,
  };
}

export const LINKING_CONFIG = {
  prefixes: [
    Linking.createURL('/'),
    `${DEEP_LINK_SCHEME}://`,
    `https://${UNIVERSAL_LINK_DOMAIN}`,
  ],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          index: '',
          game: 'game',
          profile: 'profile',
        },
      },
      'home-browser': 'home-browser',
      'home-detail': {
        path: 'home/:id',
        parse: {
          id: (id: string) => id,
        },
      },
      'home-visit': {
        path: 'home/:id/visit',
        parse: {
          id: (id: string) => id,
          multiplayer: (multiplayer: string) => multiplayer === 'true',
        },
      },
      'home-editor': 'home-editor',
      'home-creation': 'home-creation',
      'home-3d-environment': {
        path: 'home/:id/3d',
        parse: {
          id: (id: string) => id,
        },
      },
      'home-lobby': {
        path: 'home/:id/lobby',
        parse: {
          id: (id: string) => id,
        },
      },
    },
  },
};
