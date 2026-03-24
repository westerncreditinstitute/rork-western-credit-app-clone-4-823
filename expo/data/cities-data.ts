// Cities data initialization

import { City } from '../types/map';

export const CITIES_DATA: Partial<City>[] = [
  {
    name: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    center_lat: 34.0522,
    center_lng: -118.2437,
    bounds_north: 34.3373,
    bounds_south: 33.7037,
    bounds_east: -118.1553,
    bounds_west: -118.6682,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 3979576,
    description: 'The entertainment capital of the world, home to Hollywood and beautiful beaches.',
    image_url: 'https://images.unsplash.com/photo-1533930262524-5e0a7833f3c9?w=800',
  },
  {
    name: 'New York',
    state: 'NY',
    country: 'USA',
    center_lat: 40.7128,
    center_lng: -74.0060,
    bounds_north: 40.9176,
    bounds_south: 40.4774,
    bounds_east: -73.7004,
    bounds_west: -74.2591,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 8336817,
    description: 'The city that never sleeps, a global hub for finance, culture, and entertainment.',
    image_url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
  },
  {
    name: 'Miami',
    state: 'FL',
    country: 'USA',
    center_lat: 25.7617,
    center_lng: -80.1918,
    bounds_north: 25.9527,
    bounds_south: 25.5967,
    bounds_east: -80.1235,
    bounds_west: -80.3428,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 467963,
    description: 'A vibrant city known for its beaches, nightlife, and Art Deco architecture.',
    image_url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800',
  },
  {
    name: 'Chicago',
    state: 'IL',
    country: 'USA',
    center_lat: 41.8781,
    center_lng: -87.6298,
    bounds_north: 42.0231,
    bounds_south: 41.6442,
    bounds_east: -87.5240,
    bounds_west: -87.9401,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 2693976,
    description: 'The Windy City, known for its architecture, deep-dish pizza, and Lake Michigan.',
    image_url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
  },
  {
    name: 'Houston',
    state: 'TX',
    country: 'USA',
    center_lat: 29.7604,
    center_lng: -95.3698,
    bounds_north: 30.1295,
    bounds_south: 29.5167,
    bounds_east: -95.0254,
    bounds_west: -95.7875,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 2320268,
    description: 'A sprawling metropolis known for its space center, diverse culture, and energy industry.',
    image_url: 'https://images.unsplash.com/photo-1556398469-5e5246d696f6?w=800',
  },
  {
    name: 'Phoenix',
    state: 'AZ',
    country: 'USA',
    center_lat: 33.4484,
    center_lng: -112.0740,
    bounds_north: 33.8434,
    bounds_south: 33.2903,
    bounds_east: -111.9214,
    bounds_west: -112.3172,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 1680992,
    description: 'The Valley of the Sun, known for its year-round sunshine and desert landscapes.',
    image_url: 'https://images.unsplash.com/photo-1545100220-7d99a4982d2b?w=800',
  },
  {
    name: 'Atlanta',
    state: 'GA',
    country: 'USA',
    center_lat: 33.7490,
    center_lng: -84.3880,
    bounds_north: 33.8868,
    bounds_south: 33.6406,
    bounds_east: -84.2873,
    bounds_west: -84.5528,
    zoom_level: 11,
    min_zoom: 10,
    max_zoom: 18,
    population: 498715,
    description: 'The capital of the South, known for its history, civil rights movement, and peaches.',
    image_url: 'https://images.unsplash.com/photo-1575933427422-3568e627276e?w=800',
  },
];

export const initializeCities = async (): Promise<void> => {
  try {
    const { supabase } = await import('../lib/supabase');

    for (const city of CITIES_DATA) {
      const { error } = await supabase
        .from('cities')
        .upsert(city, { onConflict: 'name,state' });

      if (error) {
        console.error(`[CitiesData] Error inserting city ${city.name}:`, error.message);
      } else {
        console.log(`[CitiesData] Inserted city: ${city.name}`);
      }
    }

    console.log(`[CitiesData] Initialized ${CITIES_DATA.length} cities`);
  } catch (error) {
    console.error('[CitiesData] Error initializing cities:', error);
    throw error;
  }
};