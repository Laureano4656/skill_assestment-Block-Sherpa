export interface FallbackProperty {
  _id: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  sqm: number;
  type: string;
  availability: string;
  description: string;
  amenities: string[];
  image: string[];
  phone: string;
  googleMapLink?: string;
  status: string;
  onChainPropertyId?: number | null;
}

export const fallbackProperties: FallbackProperty[] = [
  {
    _id: "6a9b4d2f4f012dcae3dbb423",
    title: "The Glass Pavilion",
    location: "Montecito, Santa Barbara, California",
    price: 12500000,
    beds: 6,
    baths: 7,
    sqm: 820,
    type: "Villa",
    availability: "available",
    description: "An architectural tour de force set within 3.5 private acres of oak groves in prestigious Montecito. Designed with floor-to-ceiling ultra-clear Starphire glass, this pavilion harmoniously dissolves boundaries between indoor luxury and outdoor nature. Features art gallery space for 32 vehicles, infinity-edge pool, temperature-controlled wine room, and smart home automation.",
    amenities: [
      "Infinity Pool",
      "Private Wine Cellar",
      "Smart Home Automation",
      "Gallery Garage (32 Cars)",
      "Panoramic Mountain Views",
      "Spa & Sauna",
      "Guest House",
      "Security Gatehouse"
    ],
    image: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (805) 555-0142",
    googleMapLink: "https://maps.google.com/?q=Montecito,CA",
    status: "active",
    onChainPropertyId: 1, // Pre-seeded on-chain
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb424",
    title: "Skyline Penthouse",
    location: "Tribeca, New York, NY",
    price: 8950000,
    beds: 4,
    baths: 5,
    sqm: 510,
    type: "Penthouse",
    availability: "available",
    description: "Perched atop a premier cast-iron landmark in Tribeca, this triplex penthouse offers 360-degree unobstructed vistas of Manhattan and the Hudson River. Includes a private wraparound rooftop terrace with outdoor kitchen, wood-burning hearth, private key-locked elevator entry, and custom Italian Poliform kitchen.",
    amenities: [
      "Private Rooftop Terrace",
      "360-Degree Skyline Views",
      "Keyed Elevator Access",
      "24/7 Concierge",
      "Heated Bathroom Floors",
      "Custom Dressing Rooms",
      "Outdoor Kitchen"
    ],
    image: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (212) 555-0188",
    googleMapLink: "https://maps.google.com/?q=Tribeca,New+York,NY",
    status: "active",
    onChainPropertyId: 2, // Pre-seeded on-chain
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb425",
    title: "Desert Oasis Sanctuary",
    location: "Joshua Tree, Palm Springs, California",
    price: 3200000,
    beds: 4,
    baths: 3,
    sqm: 380,
    type: "House",
    availability: "available",
    description: "Striking minimalist desert modern retreat nestled against dramatic rock formations and ancient Joshua trees. Rammed-earth walls, passive solar heating, cantilevered shaded decks, saltwater plunge pool, and stargazing telescope platform offering total seclusion.",
    amenities: [
      "Saltwater Plunge Pool",
      "Stargazing Deck",
      "Rammed Earth Architecture",
      "Solar Microgrid",
      "Outdoor Firepit Lounge",
      "Desert Flora Gardens",
      "EV Charging Station"
    ],
    image: [
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (760) 555-0177",
    googleMapLink: "https://maps.google.com/?q=Joshua+Tree,CA",
    status: "active",
    onChainPropertyId: null, // Ready to register live
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb426",
    title: "Coastal Retreat Mansion",
    location: "Malibu Coast, Malibu, California",
    price: 15000000,
    beds: 5,
    baths: 6,
    sqm: 750,
    type: "Mansion",
    availability: "available",
    description: "Front-row Pacific oceanfront estate with private direct beach stairs. Open-concept entertaining pavilions with disappearing Fleetwood glass pocket doors, chef's dual kitchens, ocean-facing master suite with private balcony, and oceanfront hot tub.",
    amenities: [
      "Direct Private Beach Access",
      "Oceanfront Infinity Pool",
      "Fleetwood Pocket Glass Doors",
      "Dual Chef's Kitchens",
      "Private Guard Gated Entry",
      "Home Theater",
      "Outdoor Barbecue Pavilion"
    ],
    image: [
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (310) 555-0133",
    googleMapLink: "https://maps.google.com/?q=Malibu,CA",
    status: "active",
    onChainPropertyId: null, // Ready to register live
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb427",
    title: "Sunset Modern Masterpiece",
    location: "Sunset Strip, Beverly Hills, California",
    price: 9750000,
    beds: 5,
    baths: 6,
    sqm: 620,
    type: "Villa",
    availability: "available",
    description: "An extraordinary trophy property high above Sunset Strip offering world-class jetliner views from Downtown LA to the Pacific. Suspended infinity pool, imported terrazzo surfaces, private nightclub lounge, glass wine display, and elevator across all levels.",
    amenities: [
      "Panoramic City-to-Ocean Views",
      "Suspended Glass Pool",
      "Private Lounge & Bar",
      "Elevator Across 3 Levels",
      "Smart Security System",
      "Commercial Catering Kitchen",
      "Integrated Sound System"
    ],
    image: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (310) 555-0199",
    googleMapLink: "https://maps.google.com/?q=Beverly+Hills,CA",
    status: "active",
    onChainPropertyId: null,
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb428",
    title: "Heritage Townhouse",
    location: "Brooklyn Heights, New York, NY",
    price: 6400000,
    beds: 5,
    baths: 4,
    sqm: 440,
    type: "Townhouse",
    availability: "available",
    description: "Masterfully restored 25-foot wide Anglo-Italianate brownstone dating to 1860, combining historical crown mouldings and marble fireplaces with radiant underfloor heating, central HVAC, a landscaped English private garden, and rooftop deck overlooking lower Manhattan.",
    amenities: [
      "Private Landscaped Garden",
      "Restored Marble Fireplaces",
      "Chef's Parlor Kitchen",
      "Private Rooftop Deck",
      "Wine Cellar & Tasting Room",
      "Original Hardwood Parquet",
      "Full Basement Storage"
    ],
    image: [
      "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (718) 555-0112",
    googleMapLink: "https://maps.google.com/?q=Brooklyn+Heights,NY",
    status: "active",
    onChainPropertyId: null,
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb429",
    title: "Biscayne Waterfront Villa",
    location: "Star Island, Miami Beach, Florida",
    price: 18200000,
    beds: 7,
    baths: 8,
    sqm: 950,
    type: "Villa",
    availability: "available",
    description: "Ultra-exclusive gated Star Island waterfront haven with 100 feet of deepwater dockage accommodating superyachts up to 130 feet. Features resort-style outdoor loggia, summer kitchen, spa sanctuary, double-height foyer, and quick boat access to the Atlantic.",
    amenities: [
      "100ft Deepwater Yacht Dock",
      "Resort Lagoon Pool & Spa",
      "24/7 Island Police Patrol",
      "Outdoor Summer Kitchen",
      "Private Tennis Court",
      "Home Automation System",
      "Staff Quarters"
    ],
    image: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (305) 555-0164",
    googleMapLink: "https://maps.google.com/?q=Star+Island,Miami+Beach,FL",
    status: "active",
    onChainPropertyId: null,
  },
  {
    _id: "6a9b4d2f4f012dcae3dbb42a",
    title: "Alpine Sanctuary Chalet",
    location: "Aspen Highlands, Aspen, Colorado",
    price: 11800000,
    beds: 5,
    baths: 6,
    sqm: 680,
    type: "Chalet",
    availability: "available",
    description: "Ski-in/ski-out timber and stone mountain architectural triumph on Aspen Highlands. Vaulted heavy-timber ceilings, roaring Colorado fieldstone hearths, ski locker room with boot dryers, indoor lap pool, and panoramic snow-capped mountain views.",
    amenities: [
      "Ski-in / Ski-out Access",
      "Heated Driveway & Walkways",
      "Indoor Lap Pool & Spa",
      "Custom Ski Room with Boot Warmers",
      "Wine Tasting Lounge",
      "Stone Fireplaces in Every Suite",
      "Private Cinema"
    ],
    image: [
      "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1600&q=80"
    ],
    phone: "+1 (970) 555-0155",
    googleMapLink: "https://maps.google.com/?q=Aspen+Highlands,Aspen,CO",
    status: "active",
    onChainPropertyId: null,
  }
];
