import { PlaceType } from '../types/scavengerHunt';

export interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  placeType: PlaceType;
  address: string;
  entranceLat?: number;
  entranceLon?: number;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const PARK_HINT_TEMPLATES = [
  'Look near the main entrance of the park, where the walking trails begin.',
  'Head toward the largest open field — the treasure is hidden near the tree line.',
  'Find the playground area and search along the fence nearby.',
  'Walk to the picnic area and scan near the closest bench.',
  'The treasure awaits near the park\'s water feature or fountain area.',
  'Follow the paved path to where it curves — scan the area around the bend.',
  'Near the dog-friendly section, between the shade trees.',
  'By the park sign at the main entrance, treasure glimmers in the sunlight.',
  'Where the jogging trail meets the grass, look for the hidden anchor.',
  'Close to the restroom building, near the bike rack area.',
];

const GAS_STATION_HINT_TEMPLATES = [
  'The AR anchor is placed right at the main entrance — scan as you walk in.',
  'Look near the front door of the convenience store inside.',
  'The treasure is anchored at the entryway, between the door and the first pump.',
  'Scan near the entrance canopy — the MUSO token floats above the doorway.',
  'Right at the front entrance, the anchor glows beneath the station sign.',
];

const RESTAURANT_HINT_TEMPLATES = [
  'The AR anchor is placed at the main entrance — scan the front door area.',
  'Look right at the entryway where customers walk in.',
  'The treasure is anchored near the host stand, just inside the entrance.',
  'Scan the front of the building near the main door — the token awaits.',
  'At the entrance, beneath the restaurant sign, the MUSO anchor glows.',
];

export class PlacesService {
  private static readonly FIVE_MILES_M = 8046.72;

  static async fetchNearbyPlaces(
    lat: number,
    lon: number,
    radiusMeters: number = PlacesService.FIVE_MILES_M
  ): Promise<NearbyPlace[]> {
    try {
      console.log(`[PlacesService] Fetching real POIs near ${lat.toFixed(4)}, ${lon.toFixed(4)} within ${radiusMeters}m`);

      const query = `
        [out:json][timeout:15];
        (
          node["amenity"="fuel"](around:${radiusMeters},${lat},${lon});
          way["amenity"="fuel"](around:${radiusMeters},${lat},${lon});
          node["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
          node["amenity"="fast_food"](around:${radiusMeters},${lat},${lon});
          way["amenity"="restaurant"](around:${radiusMeters},${lat},${lon});
          node["leisure"="park"](around:${radiusMeters},${lat},${lon});
          way["leisure"="park"](around:${radiusMeters},${lat},${lon});
          relation["leisure"="park"](around:${radiusMeters},${lat},${lon});
        );
        out center tags;
      `;

      let data: any = null;
      for (const apiUrl of OVERPASS_APIS) {
        try {
          console.log(`[PlacesService] Trying Overpass endpoint: ${apiUrl}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.log(`[PlacesService] ${apiUrl} returned ${response.status}`);
            continue;
          }
          data = await response.json();
          console.log(`[PlacesService] Success from ${apiUrl}`);
          break;
        } catch (endpointError) {
          console.warn(`[PlacesService] ${apiUrl} failed:`, endpointError);
          continue;
        }
      }

      if (!data) {
        console.log('[PlacesService] All Overpass endpoints failed, returning empty');
        return [];
      }
      const elements: OverpassElement[] = data.elements || [];

      console.log(`[PlacesService] Received ${elements.length} raw POI elements`);

      const places: NearbyPlace[] = [];

      for (const el of elements) {
        const tags = el.tags || {};
        const name = tags.name || tags['name:en'];
        if (!name) continue;

        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (elLat === undefined || elLon === undefined) continue;

        let placeType: PlaceType;
        const amenity = tags.amenity || '';
        const leisure = tags.leisure || '';

        if (amenity === 'fuel') {
          placeType = 'gas_station';
        } else if (amenity === 'restaurant' || amenity === 'fast_food') {
          placeType = 'restaurant';
        } else if (leisure === 'park') {
          placeType = 'park';
        } else {
          continue;
        }

        const addressParts: string[] = [];
        if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
        if (tags['addr:street']) addressParts.push(tags['addr:street']);
        if (tags['addr:city']) addressParts.push(tags['addr:city']);
        const address = addressParts.length > 0 ? addressParts.join(' ') : '';

        places.push({
          id: `osm_${el.type}_${el.id}`,
          name,
          latitude: elLat,
          longitude: elLon,
          placeType,
          address,
          entranceLat: elLat,
          entranceLon: elLon,
        });
      }

      const gasStations = places.filter(p => p.placeType === 'gas_station');
      const restaurants = places.filter(p => p.placeType === 'restaurant');
      const parks = places.filter(p => p.placeType === 'park');

      console.log(`[PlacesService] Found ${gasStations.length} gas stations, ${restaurants.length} restaurants, ${parks.length} parks`);

      return places;
    } catch (error) {
      console.error('[PlacesService] Failed to fetch nearby places:', error);
      return [];
    }
  }

  static getSearchHintForPlace(place: NearbyPlace, random: () => number): string {
    switch (place.placeType) {
      case 'park': {
        const idx = Math.floor(random() * PARK_HINT_TEMPLATES.length);
        return `🌳 ${place.name}: ${PARK_HINT_TEMPLATES[idx]}`;
      }
      case 'gas_station': {
        const idx = Math.floor(random() * GAS_STATION_HINT_TEMPLATES.length);
        return `⛽ ${place.name}: ${GAS_STATION_HINT_TEMPLATES[idx]}`;
      }
      case 'restaurant': {
        const idx = Math.floor(random() * RESTAURANT_HINT_TEMPLATES.length);
        return `🍽️ ${place.name}: ${RESTAURANT_HINT_TEMPLATES[idx]}`;
      }
      default:
        return `Search near ${place.name}`;
    }
  }

  static selectPlacesForTreasures(
    allPlaces: NearbyPlace[],
    distribution: PlaceType[],
    random: () => number
  ): (NearbyPlace | null)[] {
    const gasStations = [...allPlaces.filter(p => p.placeType === 'gas_station')];
    const restaurants = [...allPlaces.filter(p => p.placeType === 'restaurant')];
    const parks = [...allPlaces.filter(p => p.placeType === 'park')];

    const shuffle = (arr: NearbyPlace[]) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    };

    shuffle(gasStations);
    shuffle(restaurants);
    shuffle(parks);

    const usedGas: Set<string> = new Set();
    const usedRestaurant: Set<string> = new Set();
    const usedPark: Set<string> = new Set();

    return distribution.map(type => {
      let pool: NearbyPlace[];
      let usedSet: Set<string>;

      switch (type) {
        case 'gas_station':
          pool = gasStations;
          usedSet = usedGas;
          break;
        case 'restaurant':
          pool = restaurants;
          usedSet = usedRestaurant;
          break;
        case 'park':
          pool = parks;
          usedSet = usedPark;
          break;
        default:
          return null;
      }

      const available = pool.find(p => !usedSet.has(p.id));
      if (available) {
        usedSet.add(available.id);
        return available;
      }
      return null;
    });
  }
}
