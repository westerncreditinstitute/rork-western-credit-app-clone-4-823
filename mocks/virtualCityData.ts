export interface VirtualLocation {
  id: string;
  name: string;
  type: 'landmark' | 'restaurant' | 'shop' | 'park' | 'nightlife' | 'business' | 'residence' | 'beach' | 'cultural';
  description: string;
  imageUrl: string;
  neighborhood: string;
  interactionText: string;
  cost?: number;
  creditImpact?: string;
}

export interface VirtualStreet {
  id: string;
  name: string;
  neighborhood: string;
  description: string;
  imageUrl: string;
  locations: VirtualLocation[];
  ambiance: string;
  trafficLevel: 'low' | 'medium' | 'high';
  safetyRating: number;
}

export interface VirtualCityConfig {
  cityId: string;
  cityName: string;
  tagline: string;
  heroImageUrl: string;
  skylineImageUrl: string;
  weatherEmoji: string;
  temperature: string;
  streets: VirtualStreet[];
  quickFacts: string[];
}

const LA_STREETS: VirtualStreet[] = [
  {
    id: 'la_hollywood_blvd',
    name: 'Hollywood Boulevard',
    neighborhood: 'Hollywood',
    description: 'The iconic Walk of Fame stretches before you. Tourist crowds mingle with street performers under the neon glow of movie theaters.',
    imageUrl: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=800',
    ambiance: 'Buzzing with energy and camera flashes',
    trafficLevel: 'high',
    safetyRating: 7,
    locations: [
      { id: 'la_h1', name: 'TCL Chinese Theatre', type: 'landmark', description: 'The legendary movie palace where Hollywood premieres happen. Handprints of stars line the forecourt.', imageUrl: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400', neighborhood: 'Hollywood', interactionText: 'Take a photo with the handprints ($15)', cost: 15 },
      { id: 'la_h2', name: 'Musso & Frank Grill', type: 'restaurant', description: 'The oldest restaurant in Hollywood. Old-school glamour and classic cocktails since 1919.', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', neighborhood: 'Hollywood', interactionText: 'Dine at this legendary spot ($85)', cost: 85 },
      { id: 'la_h3', name: 'Hollywood & Highland', type: 'shop', description: 'Open-air shopping and entertainment complex with views of the Hollywood Sign.', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', neighborhood: 'Hollywood', interactionText: 'Browse the luxury shops', cost: 0 },
    ],
  },
  {
    id: 'la_rodeo_drive',
    name: 'Rodeo Drive',
    neighborhood: 'Beverly Hills',
    description: 'Palm-lined streets of pure luxury. Lamborghinis cruise past designer storefronts as shopping bags swing from manicured hands.',
    imageUrl: 'https://images.unsplash.com/photo-1609793905386-c30e1cec0c3f?w=800',
    ambiance: 'Exclusive and polished',
    trafficLevel: 'medium',
    safetyRating: 10,
    locations: [
      { id: 'la_r1', name: 'Gucci Beverly Hills', type: 'shop', description: 'Three floors of Italian luxury fashion. The flagship store gleams with marble and gold.', imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', neighborhood: 'Beverly Hills', interactionText: 'Window shop at Gucci', cost: 0, creditImpact: 'Opening a store credit card could impact your score' },
      { id: 'la_r2', name: 'Spago Beverly Hills', type: 'restaurant', description: 'Wolfgang Puck\'s legendary restaurant. Where deals are made over truffle pasta.', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', neighborhood: 'Beverly Hills', interactionText: 'Reserve a table ($150)', cost: 150 },
      { id: 'la_r3', name: 'Beverly Wilshire Hotel', type: 'landmark', description: 'The iconic hotel from Pretty Woman. A Tuscan-Renaissance masterpiece.', imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400', neighborhood: 'Beverly Hills', interactionText: 'Tour the grand lobby', cost: 0 },
    ],
  },
  {
    id: 'la_venice_boardwalk',
    name: 'Venice Beach Boardwalk',
    neighborhood: 'Venice',
    description: 'Skateboarders weave between vendors selling handmade jewelry. Muscle Beach bodybuilders flex in the California sun.',
    imageUrl: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=800',
    ambiance: 'Bohemian and free-spirited',
    trafficLevel: 'high',
    safetyRating: 6,
    locations: [
      { id: 'la_v1', name: 'Muscle Beach', type: 'landmark', description: 'The legendary outdoor gym where Arnold Schwarzenegger once trained.', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', neighborhood: 'Venice', interactionText: 'Work out at Muscle Beach ($10)', cost: 10 },
      { id: 'la_v2', name: 'Abbot Kinney Boulevard', type: 'shop', description: 'LA\'s coolest street. Indie boutiques, art galleries, and artisan coffee.', imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400', neighborhood: 'Venice', interactionText: 'Explore the indie shops', cost: 0 },
      { id: 'la_v3', name: 'Venice Canals', type: 'park', description: 'Peaceful walkways along man-made canals. A hidden gem steps from the boardwalk chaos.', imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', neighborhood: 'Venice', interactionText: 'Walk the canals (free)', cost: 0 },
    ],
  },
  {
    id: 'la_dtla',
    name: 'Downtown Arts District',
    neighborhood: 'Downtown',
    description: 'Converted warehouses house craft breweries and art galleries. Murals cover every wall in this creative hub.',
    imageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800',
    ambiance: 'Creative and urban',
    trafficLevel: 'medium',
    safetyRating: 7,
    locations: [
      { id: 'la_d1', name: 'The Broad Museum', type: 'cultural', description: 'Free contemporary art museum housing works by Basquiat, Warhol, and Koons.', imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400', neighborhood: 'Downtown', interactionText: 'Visit the museum (free)', cost: 0 },
      { id: 'la_d2', name: 'Grand Central Market', type: 'restaurant', description: 'Historic food hall since 1917. A melting pot of cuisines from around the world.', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400', neighborhood: 'Downtown', interactionText: 'Grab a bite ($25)', cost: 25 },
      { id: 'la_d3', name: 'Angel City Brewery', type: 'nightlife', description: 'Craft brewery in a 100-year-old warehouse. Live music on weekends.', imageUrl: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400', neighborhood: 'Downtown', interactionText: 'Have a craft beer ($12)', cost: 12 },
    ],
  },
  {
    id: 'la_santa_monica',
    name: 'Santa Monica Pier',
    neighborhood: 'Santa Monica',
    description: 'The Pacific Park Ferris wheel towers over the pier. Salt air mixes with the smell of funnel cake as waves crash below.',
    imageUrl: 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=800',
    ambiance: 'Beachy and carefree',
    trafficLevel: 'high',
    safetyRating: 8,
    locations: [
      { id: 'la_s1', name: 'Pacific Park', type: 'landmark', description: 'The iconic amusement park on the pier with the solar-powered Ferris wheel.', imageUrl: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400', neighborhood: 'Santa Monica', interactionText: 'Ride the Ferris wheel ($12)', cost: 12 },
      { id: 'la_s2', name: 'The Lobster', type: 'restaurant', description: 'Upscale seafood with panoramic ocean views right at the pier entrance.', imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400', neighborhood: 'Santa Monica', interactionText: 'Dinner with ocean views ($95)', cost: 95 },
      { id: 'la_s3', name: 'Third Street Promenade', type: 'shop', description: 'Three blocks of outdoor shopping and street performers.', imageUrl: 'https://images.unsplash.com/photo-1567449303078-57ad995bd329?w=400', neighborhood: 'Santa Monica', interactionText: 'Shop the promenade', cost: 0 },
    ],
  },
];

const MIAMI_STREETS: VirtualStreet[] = [
  {
    id: 'mi_ocean_drive',
    name: 'Ocean Drive',
    neighborhood: 'South Beach',
    description: 'Neon-lit Art Deco buildings line the strip. Convertibles cruise past outdoor cafes as bass-heavy music spills from every doorway.',
    imageUrl: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800',
    ambiance: 'Electric and glamorous',
    trafficLevel: 'high',
    safetyRating: 7,
    locations: [
      { id: 'mi_o1', name: 'The Clevelander', type: 'nightlife', description: 'Iconic poolside bar and nightclub. DJs spin as the party goes from day to night.', imageUrl: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=400', neighborhood: 'South Beach', interactionText: 'Hit the pool party ($40)', cost: 40 },
      { id: 'mi_o2', name: 'Versace Mansion', type: 'landmark', description: 'The legendary Casa Casuarina. Now a luxury boutique hotel with an infamous history.', imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400', neighborhood: 'South Beach', interactionText: 'Admire the architecture', cost: 0 },
      { id: 'mi_o3', name: 'News Cafe', type: 'restaurant', description: 'A South Beach institution since 1988. The best people-watching spot on Ocean Drive.', imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400', neighborhood: 'South Beach', interactionText: 'Coffee and people-watching ($18)', cost: 18 },
    ],
  },
  {
    id: 'mi_brickell',
    name: 'Brickell Avenue',
    neighborhood: 'Brickell',
    description: 'Miami\'s Wall Street. Glass towers reflect the bay as young professionals in designer suits stride toward power lunches.',
    imageUrl: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=800',
    ambiance: 'Sophisticated and ambitious',
    trafficLevel: 'high',
    safetyRating: 9,
    locations: [
      { id: 'mi_b1', name: 'Brickell City Centre', type: 'shop', description: 'Massive open-air luxury shopping center with a climate ribbon overhead.', imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=400', neighborhood: 'Brickell', interactionText: 'Browse designer stores', cost: 0, creditImpact: 'Luxury purchases affect your budget' },
      { id: 'mi_b2', name: 'Komodo', type: 'restaurant', description: 'Three-story indoor/outdoor restaurant. Southeast Asian fusion where celebrities dine.', imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400', neighborhood: 'Brickell', interactionText: 'Dine at Komodo ($120)', cost: 120 },
      { id: 'mi_b3', name: 'Mary Brickell Village', type: 'nightlife', description: 'Open-air dining and nightlife complex in the heart of Brickell.', imageUrl: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400', neighborhood: 'Brickell', interactionText: 'Explore the village', cost: 0 },
    ],
  },
  {
    id: 'mi_wynwood',
    name: 'Wynwood Walls',
    neighborhood: 'Wynwood',
    description: 'Massive murals by world-famous street artists transform warehouse walls into an open-air museum of color and creativity.',
    imageUrl: 'https://images.unsplash.com/photo-1571504211935-1c936b327411?w=800',
    ambiance: 'Artistic and vibrant',
    trafficLevel: 'medium',
    safetyRating: 7,
    locations: [
      { id: 'mi_w1', name: 'Wynwood Walls Gallery', type: 'cultural', description: 'The heart of the art district. Rotating exhibitions from global street artists.', imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400', neighborhood: 'Wynwood', interactionText: 'Tour the art walls ($12)', cost: 12 },
      { id: 'mi_w2', name: 'Zak the Baker', type: 'restaurant', description: 'Artisanal bakery and cafe in a converted warehouse. Famous for sourdough.', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400', neighborhood: 'Wynwood', interactionText: 'Grab fresh pastries ($15)', cost: 15 },
      { id: 'mi_w3', name: 'The Salty Donut', type: 'restaurant', description: 'Gourmet donut shop in a vintage Airstream trailer.', imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400', neighborhood: 'Wynwood', interactionText: 'Try a gourmet donut ($8)', cost: 8 },
    ],
  },
  {
    id: 'mi_key_biscayne',
    name: 'Crandon Boulevard',
    neighborhood: 'Key Biscayne',
    description: 'A tropical island paradise minutes from downtown. Crystal waters and swaying palms define this exclusive enclave.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
    ambiance: 'Serene and exclusive',
    trafficLevel: 'low',
    safetyRating: 10,
    locations: [
      { id: 'mi_k1', name: 'Crandon Park Beach', type: 'beach', description: 'Consistently rated one of the top beaches in the US. Turquoise water and white sand.', imageUrl: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=400', neighborhood: 'Key Biscayne', interactionText: 'Relax on the beach (free)', cost: 0 },
      { id: 'mi_k2', name: 'Rusty Pelican', type: 'restaurant', description: 'Waterfront dining with stunning views of the Miami skyline across the bay.', imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400', neighborhood: 'Key Biscayne', interactionText: 'Waterfront dinner ($110)', cost: 110 },
      { id: 'mi_k3', name: 'Bill Baggs State Park', type: 'park', description: 'Home to the historic Cape Florida Lighthouse. Nature trails and pristine beaches.', imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400', neighborhood: 'Key Biscayne', interactionText: 'Hike the trails ($5)', cost: 5 },
    ],
  },
  {
    id: 'mi_coral_gables',
    name: 'Miracle Mile',
    neighborhood: 'Coral Gables',
    description: 'Mediterranean Revival architecture lines the elegant boulevard. Banyan trees shade sidewalk cafes in the City Beautiful.',
    imageUrl: 'https://images.unsplash.com/photo-1582407947092-18b2a7846b39?w=800',
    ambiance: 'Elegant and historic',
    trafficLevel: 'medium',
    safetyRating: 9,
    locations: [
      { id: 'mi_c1', name: 'Venetian Pool', type: 'landmark', description: 'A stunning public pool carved from coral rock in 1924. A National Historic landmark.', imageUrl: 'https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=400', neighborhood: 'Coral Gables', interactionText: 'Swim at the Venetian Pool ($15)', cost: 15 },
      { id: 'mi_c2', name: 'Books & Books', type: 'cultural', description: 'Iconic independent bookstore with a charming courtyard and author events.', imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400', neighborhood: 'Coral Gables', interactionText: 'Browse the bookstore', cost: 0 },
      { id: 'mi_c3', name: 'Biltmore Hotel', type: 'landmark', description: 'The legendary 1926 luxury resort. Its tower is a replica of Seville\'s Giralda.', imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', neighborhood: 'Coral Gables', interactionText: 'Tour the historic hotel', cost: 0 },
    ],
  },
];

const NYC_STREETS: VirtualStreet[] = [
  {
    id: 'ny_times_square',
    name: 'Times Square',
    neighborhood: 'Manhattan',
    description: 'The crossroads of the world blazes with massive LED billboards. Yellow cabs honk in gridlock as Broadway marquees light up the night.',
    imageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800',
    ambiance: 'Overwhelming and electric',
    trafficLevel: 'high',
    safetyRating: 8,
    locations: [
      { id: 'ny_t1', name: 'Broadway Theater', type: 'cultural', description: 'Catch a world-class Broadway show. The Theater District is the pinnacle of live performance.', imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400', neighborhood: 'Manhattan', interactionText: 'See a Broadway show ($175)', cost: 175 },
      { id: 'ny_t2', name: 'Sardi\'s Restaurant', type: 'restaurant', description: 'Legendary theatrical dining since 1927. Caricatures of stars line the walls.', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400', neighborhood: 'Manhattan', interactionText: 'Pre-show dinner ($95)', cost: 95 },
      { id: 'ny_t3', name: 'M&M\'s World', type: 'shop', description: 'Three floors of candy-colored chaos. A Times Square tourist rite of passage.', imageUrl: 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=400', neighborhood: 'Manhattan', interactionText: 'Grab some souvenirs ($20)', cost: 20 },
    ],
  },
  {
    id: 'ny_fifth_ave',
    name: 'Fifth Avenue',
    neighborhood: 'Manhattan',
    description: 'The most prestigious shopping street in the world. Tiffany\'s, Saks, and Bergdorf Goodman stand as monuments to luxury.',
    imageUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800',
    ambiance: 'Luxurious and fast-paced',
    trafficLevel: 'high',
    safetyRating: 9,
    locations: [
      { id: 'ny_f1', name: 'Tiffany & Co.', type: 'shop', description: 'The flagship store. Breakfast at Tiffany\'s is a cultural touchstone.', imageUrl: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=400', neighborhood: 'Manhattan', interactionText: 'Browse the blue boxes', cost: 0, creditImpact: 'Financing jewelry affects your debt ratio' },
      { id: 'ny_f2', name: 'St. Patrick\'s Cathedral', type: 'landmark', description: 'Gothic Revival masterpiece. A spiritual oasis amid the skyscrapers.', imageUrl: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=400', neighborhood: 'Manhattan', interactionText: 'Visit the cathedral (free)', cost: 0 },
      { id: 'ny_f3', name: 'Top of the Rock', type: 'landmark', description: 'Observation deck at 30 Rockefeller Plaza. Unmatched views of the Empire State Building.', imageUrl: 'https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=400', neighborhood: 'Manhattan', interactionText: 'Ride to the top ($40)', cost: 40 },
    ],
  },
  {
    id: 'ny_brooklyn_bridge',
    name: 'DUMBO & Brooklyn Bridge',
    neighborhood: 'Brooklyn',
    description: 'The Manhattan Bridge frames the iconic view. Cobblestone streets host converted warehouses turned into trendy galleries and cafes.',
    imageUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800',
    ambiance: 'Trendy and photogenic',
    trafficLevel: 'medium',
    safetyRating: 8,
    locations: [
      { id: 'ny_b1', name: 'Brooklyn Bridge Walk', type: 'landmark', description: 'Walk across the 1883 engineering marvel. Stunning views of Manhattan and the harbor.', imageUrl: 'https://images.unsplash.com/photo-1496588152823-86ff7695e68f?w=400', neighborhood: 'Brooklyn', interactionText: 'Walk the bridge (free)', cost: 0 },
      { id: 'ny_b2', name: 'Grimaldi\'s Pizzeria', type: 'restaurant', description: 'Coal-fired pizza under the Brooklyn Bridge. Worth every minute of the wait.', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', neighborhood: 'Brooklyn', interactionText: 'Famous pizza ($22)', cost: 22 },
      { id: 'ny_b3', name: 'Brooklyn Flea Market', type: 'shop', description: 'Weekend market with vintage finds, local crafts, and incredible street food.', imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400', neighborhood: 'Brooklyn', interactionText: 'Browse the flea market', cost: 0 },
    ],
  },
  {
    id: 'ny_central_park',
    name: 'Central Park South',
    neighborhood: 'Manhattan',
    description: 'Horse-drawn carriages clip-clop past the park entrance. The green oasis stretches north, framed by billionaire\'s row towers.',
    imageUrl: 'https://images.unsplash.com/photo-1534804022790-dabfea04abea?w=800',
    ambiance: 'Peaceful amid the chaos',
    trafficLevel: 'medium',
    safetyRating: 9,
    locations: [
      { id: 'ny_c1', name: 'The Plaza Hotel', type: 'landmark', description: 'The iconic luxury hotel on Central Park South. Home to Eloise and countless films.', imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400', neighborhood: 'Manhattan', interactionText: 'Tea at The Plaza ($75)', cost: 75 },
      { id: 'ny_c2', name: 'Central Park Zoo', type: 'park', description: 'A charming zoo right in the heart of Manhattan. Sea lions and penguins delight visitors.', imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=400', neighborhood: 'Manhattan', interactionText: 'Visit the zoo ($18)', cost: 18 },
      { id: 'ny_c3', name: 'Bethesda Fountain', type: 'park', description: 'The crown jewel of Central Park. Angel of the Waters presides over the terrace.', imageUrl: 'https://images.unsplash.com/photo-1568515387631-8b650bbcdb90?w=400', neighborhood: 'Manhattan', interactionText: 'Stroll the terrace (free)', cost: 0 },
    ],
  },
  {
    id: 'ny_soho',
    name: 'SoHo Streets',
    neighborhood: 'Manhattan',
    description: 'Cast-iron architecture houses world-class galleries and boutiques. Cobblestone streets echo with artistic ambition.',
    imageUrl: 'https://images.unsplash.com/photo-1555992336-03a23c7b20ee?w=800',
    ambiance: 'Artistic and fashionable',
    trafficLevel: 'medium',
    safetyRating: 8,
    locations: [
      { id: 'ny_s1', name: 'Artist\'s Loft Gallery', type: 'cultural', description: 'Cutting-edge contemporary art in a converted industrial space.', imageUrl: 'https://images.unsplash.com/photo-1531913764164-f85c3e01b654?w=400', neighborhood: 'Manhattan', interactionText: 'Browse the gallery (free)', cost: 0 },
      { id: 'ny_s2', name: 'Balthazar', type: 'restaurant', description: 'The quintessential New York brasserie. French bistro charm in the heart of SoHo.', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', neighborhood: 'Manhattan', interactionText: 'Brunch at Balthazar ($65)', cost: 65 },
      { id: 'ny_s3', name: 'MoMA Design Store', type: 'shop', description: 'Curated design objects and unique gifts from the Museum of Modern Art.', imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400', neighborhood: 'Manhattan', interactionText: 'Shop designer objects ($30)', cost: 30 },
    ],
  },
];

const CHICAGO_STREETS: VirtualStreet[] = [
  {
    id: 'ch_mag_mile',
    name: 'The Magnificent Mile',
    neighborhood: 'The Loop',
    description: 'Chicago\'s premier shopping boulevard. Gleaming skyscrapers tower over flagship stores and deep-dish pizza joints.',
    imageUrl: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800',
    ambiance: 'Grand and bustling',
    trafficLevel: 'high',
    safetyRating: 8,
    locations: [
      { id: 'ch_m1', name: 'Willis Tower Skydeck', type: 'landmark', description: 'Step onto The Ledge—a glass box 1,353 feet above the city.', imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400', neighborhood: 'The Loop', interactionText: 'Visit the Skydeck ($28)', cost: 28 },
      { id: 'ch_m2', name: 'Giordano\'s', type: 'restaurant', description: 'The legendary deep-dish pizza. A thick, cheesy, saucy masterpiece.', imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400', neighborhood: 'The Loop', interactionText: 'Deep-dish pizza ($25)', cost: 25 },
      { id: 'ch_m3', name: 'Art Institute of Chicago', type: 'cultural', description: 'One of the world\'s great art museums. Home to A Sunday on La Grande Jatte.', imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400', neighborhood: 'The Loop', interactionText: 'Visit the museum ($25)', cost: 25 },
    ],
  },
  {
    id: 'ch_lincoln_park',
    name: 'Lincoln Park',
    neighborhood: 'Lincoln Park',
    description: 'Chicago\'s largest park stretches along the lakefront. Historic brownstones and trendy restaurants line the surrounding streets.',
    imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
    ambiance: 'Upscale and green',
    trafficLevel: 'low',
    safetyRating: 9,
    locations: [
      { id: 'ch_l1', name: 'Lincoln Park Zoo', type: 'park', description: 'One of the last free zoos in America. A local treasure since 1868.', imageUrl: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=400', neighborhood: 'Lincoln Park', interactionText: 'Visit the free zoo', cost: 0 },
      { id: 'ch_l2', name: 'Alinea', type: 'restaurant', description: 'Three-Michelin-star molecular gastronomy. The best restaurant in Chicago.', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', neighborhood: 'Lincoln Park', interactionText: 'Dine at Alinea ($350)', cost: 350 },
      { id: 'ch_l3', name: 'North Avenue Beach', type: 'beach', description: 'Chicago\'s most popular beach with skyline views and volleyball courts.', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400', neighborhood: 'Lincoln Park', interactionText: 'Beach day (free)', cost: 0 },
    ],
  },
];

const HOUSTON_STREETS: VirtualStreet[] = [
  {
    id: 'ho_heights',
    name: 'Heights Boulevard',
    neighborhood: 'The Heights',
    description: 'Tree-lined esplanade through Houston\'s most charming historic neighborhood. Victorian homes and local boutiques define the vibe.',
    imageUrl: 'https://images.unsplash.com/photo-1548532928-b34e3be62fc6?w=800',
    ambiance: 'Charming and walkable',
    trafficLevel: 'low',
    safetyRating: 9,
    locations: [
      { id: 'ho_h1', name: 'Heights Mercantile', type: 'shop', description: 'Curated shopping destination with local boutiques and artisan goods.', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400', neighborhood: 'The Heights', interactionText: 'Shop local stores', cost: 0 },
      { id: 'ho_h2', name: 'Coltivare', type: 'restaurant', description: 'Farm-to-table Italian with a garden you can see from your table.', imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400', neighborhood: 'The Heights', interactionText: 'Farm-to-table dinner ($55)', cost: 55 },
    ],
  },
  {
    id: 'ho_downtown',
    name: 'Main Street Downtown',
    neighborhood: 'Downtown',
    description: 'Houston\'s skyline punctuates the horizon. The light rail glides through the revitalized downtown core.',
    imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800',
    ambiance: 'Urban and energetic',
    trafficLevel: 'high',
    safetyRating: 7,
    locations: [
      { id: 'ho_d1', name: 'Space Center Houston', type: 'landmark', description: 'NASA\'s official visitor center. Touch a real moon rock and see Mission Control.', imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=400', neighborhood: 'Downtown', interactionText: 'Visit Space Center ($30)', cost: 30 },
      { id: 'ho_d2', name: 'Museum District', type: 'cultural', description: '19 museums in a walkable district. The Museum of Fine Arts is world-class.', imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400', neighborhood: 'Downtown', interactionText: 'Visit museums ($15)', cost: 15 },
    ],
  },
];

const PHOENIX_STREETS: VirtualStreet[] = [
  {
    id: 'ph_scottsdale',
    name: 'Old Town Scottsdale',
    neighborhood: 'Scottsdale',
    description: 'Western heritage meets modern luxury. Art galleries, wine bars, and turquoise jewelry shops line sun-baked sidewalks.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    ambiance: 'Desert chic',
    trafficLevel: 'medium',
    safetyRating: 9,
    locations: [
      { id: 'ph_s1', name: 'Scottsdale Museum of Contemporary Art', type: 'cultural', description: 'Sleek modern museum showcasing contemporary art, architecture, and design.', imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400', neighborhood: 'Scottsdale', interactionText: 'Visit the museum ($10)', cost: 10 },
      { id: 'ph_s2', name: 'The Mission', type: 'restaurant', description: 'Modern Latin cuisine in a stunning Old Town setting with mountain views.', imageUrl: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400', neighborhood: 'Scottsdale', interactionText: 'Latin fusion dinner ($65)', cost: 65 },
    ],
  },
];

const ATLANTA_STREETS: VirtualStreet[] = [
  {
    id: 'at_buckhead',
    name: 'Peachtree Road',
    neighborhood: 'Buckhead',
    description: 'Atlanta\'s Beverly Hills. Luxury high-rises, designer boutiques, and Southern charm blend on this iconic road.',
    imageUrl: 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=800',
    ambiance: 'Upscale Southern',
    trafficLevel: 'high',
    safetyRating: 8,
    locations: [
      { id: 'at_b1', name: 'Lenox Square', type: 'shop', description: 'Premier shopping destination with luxury brands and Atlanta\'s best retail.', imageUrl: 'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=400', neighborhood: 'Buckhead', interactionText: 'Shop at Lenox', cost: 0 },
      { id: 'at_b2', name: 'STK Steakhouse', type: 'restaurant', description: 'High-energy steakhouse with DJ vibes and premium cuts.', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', neighborhood: 'Buckhead', interactionText: 'Steak dinner ($85)', cost: 85 },
    ],
  },
  {
    id: 'at_midtown',
    name: 'Midtown Mile',
    neighborhood: 'Midtown',
    description: 'The cultural heart of Atlanta. World-class museums, the High Museum, and Piedmont Park anchor this vibrant district.',
    imageUrl: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=800',
    ambiance: 'Cultural and lively',
    trafficLevel: 'medium',
    safetyRating: 8,
    locations: [
      { id: 'at_m1', name: 'High Museum of Art', type: 'cultural', description: 'The Southeast\'s premier art museum. Richard Meier\'s white building is itself a work of art.', imageUrl: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400', neighborhood: 'Midtown', interactionText: 'Visit the High Museum ($18)', cost: 18 },
      { id: 'at_m2', name: 'Piedmont Park', type: 'park', description: 'Atlanta\'s Central Park. Skyline views, running trails, and community events.', imageUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400', neighborhood: 'Midtown', interactionText: 'Walk through the park (free)', cost: 0 },
    ],
  },
];

const DENVER_STREETS: VirtualStreet[] = [
  {
    id: 'de_larimer',
    name: 'Larimer Square',
    neighborhood: 'LoDo',
    description: 'Denver\'s oldest block glows with string lights. Victorian buildings house craft cocktail bars and farm-to-table restaurants.',
    imageUrl: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=800',
    ambiance: 'Historic and festive',
    trafficLevel: 'medium',
    safetyRating: 8,
    locations: [
      { id: 'de_l1', name: 'Rioja', type: 'restaurant', description: 'James Beard Award-winning Mediterranean cuisine in the heart of Larimer Square.', imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400', neighborhood: 'LoDo', interactionText: 'Dine at Rioja ($80)', cost: 80 },
      { id: 'de_l2', name: 'Tattered Cover Bookstore', type: 'cultural', description: 'Denver\'s beloved independent bookstore. A cozy literary landmark since 1971.', imageUrl: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=400', neighborhood: 'LoDo', interactionText: 'Browse the bookstore', cost: 0 },
    ],
  },
];

export const VIRTUAL_CITY_CONFIGS: Record<string, VirtualCityConfig> = {
  city_los_angeles: {
    cityId: 'city_los_angeles',
    cityName: 'Los Angeles',
    tagline: 'City of Angels',
    heroImageUrl: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=1200',
    weatherEmoji: '☀️',
    temperature: '78°F',
    streets: LA_STREETS,
    quickFacts: ['Population: 3.9M', 'Known for: Entertainment', '75mi coastline', 'Avg rent: $2,762/mo'],
  },
  city_miami: {
    cityId: 'city_miami',
    cityName: 'Miami',
    tagline: 'Magic City',
    heroImageUrl: 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1200',
    weatherEmoji: '🌴',
    temperature: '85°F',
    streets: MIAMI_STREETS,
    quickFacts: ['Population: 450K', 'Known for: Beach life', 'No state tax', 'Avg rent: $2,939/mo'],
  },
  city_new_york: {
    cityId: 'city_new_york',
    cityName: 'New York City',
    tagline: 'The Big Apple',
    heroImageUrl: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1200',
    weatherEmoji: '🌆',
    temperature: '62°F',
    streets: NYC_STREETS,
    quickFacts: ['Population: 8.3M', 'Known for: Finance', '520mi coastline', 'Avg rent: $3,643/mo'],
  },
  city_chicago: {
    cityId: 'city_chicago',
    cityName: 'Chicago',
    tagline: 'The Windy City',
    heroImageUrl: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200',
    weatherEmoji: '🌬️',
    temperature: '55°F',
    streets: CHICAGO_STREETS,
    quickFacts: ['Population: 2.7M', 'Known for: Architecture', 'Great food scene', 'Avg rent: $1,800/mo'],
  },
  city_houston: {
    cityId: 'city_houston',
    cityName: 'Houston',
    tagline: 'Space City',
    heroImageUrl: 'https://images.unsplash.com/photo-1548532928-b34e3be62fc6?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200',
    weatherEmoji: '🌤️',
    temperature: '82°F',
    streets: HOUSTON_STREETS,
    quickFacts: ['Population: 2.3M', 'Known for: Energy', 'No state tax', 'Avg rent: $1,400/mo'],
  },
  city_phoenix: {
    cityId: 'city_phoenix',
    cityName: 'Phoenix',
    tagline: 'Valley of the Sun',
    heroImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
    weatherEmoji: '🏜️',
    temperature: '95°F',
    streets: PHOENIX_STREETS,
    quickFacts: ['Population: 1.7M', 'Known for: Tech', 'Year-round sun', 'Avg rent: $1,500/mo'],
  },
  city_atlanta: {
    cityId: 'city_atlanta',
    cityName: 'Atlanta',
    tagline: 'The ATL',
    heroImageUrl: 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1555109307-f7d9da25c244?w=1200',
    weatherEmoji: '🍑',
    temperature: '72°F',
    streets: ATLANTA_STREETS,
    quickFacts: ['Population: 500K', 'Known for: Film & Music', 'Fortune 500 HQs', 'Avg rent: $1,600/mo'],
  },
  city_denver: {
    cityId: 'city_denver',
    cityName: 'Denver',
    tagline: 'Mile High City',
    heroImageUrl: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1200',
    skylineImageUrl: 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1200',
    weatherEmoji: '⛰️',
    temperature: '58°F',
    streets: DENVER_STREETS,
    quickFacts: ['Population: 730K', 'Known for: Outdoors', 'Craft beer capital', 'Avg rent: $1,900/mo'],
  },
};

export function getVirtualCityConfig(cityId: string): VirtualCityConfig | null {
  return VIRTUAL_CITY_CONFIGS[cityId] || null;
}

export function getAllVirtualCities(): VirtualCityConfig[] {
  return Object.values(VIRTUAL_CITY_CONFIGS);
}
