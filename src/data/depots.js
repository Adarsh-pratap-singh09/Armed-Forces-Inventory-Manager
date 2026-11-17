/**
 * Illustrative Indian Armed Forces Depots
 * 
 * NOTE: All depot names, locations, numbers, and parameters in this project
 * are illustrative and synthetic for academic research.
 * 
 * 8 Illustrative Depots across Army, Navy, and Air Force:
 * - Army (5): Leh, Pathankot, Jodhpur, Guwahati, Pune
 * - Navy (2): Visakhapatnam, Kochi
 * - Air Force (1): Chandigarh
 */

export const DEPOTS = [
  {
    id: 'leh',
    name: 'Leh Forward Logistics Depot',
    shortName: 'Leh',
    service: 'Army',
    command: 'Northern Command (14 Corps)',
    state: 'Ladakh',
    climate: 'High Altitude & Extreme Cold Desert',
    sizeScale: 0.90,
    leadTimeWeeks: 6.0, // Longest requisition lead time due to mountain passes & snow closure
    leadTimeReason: 'Mountain pass dependency (Zoji La / Atal Tunnel) and winter weather bottlenecks',
    description: 'High-altitude strategic corps logistics base supporting forward posts in sub-zero terrain.',
    coordinates: { lat: 34.1526, lng: 77.5771 }
  },
  {
    id: 'pathankot',
    name: 'Pathankot Intermediate Staging Depot',
    shortName: 'Pathankot',
    service: 'Army',
    command: 'Western Command',
    state: 'Punjab',
    climate: 'Subtropical Plains & Northern Border',
    sizeScale: 1.15,
    leadTimeWeeks: 2.5,
    leadTimeReason: 'Direct arterial railhead and national highway transit corridors',
    description: 'Frontline intermediate ordnance and supply node feeding northern strike formations.',
    coordinates: { lat: 32.2686, lng: 75.6527 }
  },
  {
    id: 'jodhpur',
    name: 'Jodhpur Desert Sector Logistics Depot',
    shortName: 'Jodhpur',
    service: 'Army',
    command: 'South Western Command (12 Corps)',
    state: 'Rajasthan',
    climate: 'Arid Thar Desert (Extreme Heat & Dust)',
    sizeScale: 1.05,
    leadTimeWeeks: 3.0,
    leadTimeReason: 'Desert corridor transit lines with high environmental wear during summer',
    description: 'Desert logistics depot maintaining high vehicular readiness in arid dust conditions.',
    coordinates: { lat: 26.2389, lng: 73.0243 }
  },
  {
    id: 'guwahati',
    name: 'Guwahati Transit Supply Depot',
    shortName: 'Guwahati',
    service: 'Army',
    command: 'Eastern Command',
    state: 'Assam',
    climate: 'Humid Subtropical & Heavy Monsoon Hills',
    sizeScale: 1.10,
    leadTimeWeeks: 4.0,
    leadTimeReason: 'Siliguri Corridor gateway, monsoon flood risks, and northeastern hill roads',
    description: 'Vital transit conduit for forward eastern mountain divisions; subject to monsoon constraints.',
    coordinates: { lat: 26.1445, lng: 91.7362 }
  },
  {
    id: 'pune',
    name: 'Pune Central Logistics Hub',
    shortName: 'Pune',
    service: 'Army',
    command: 'Southern Command HQ',
    state: 'Maharashtra',
    climate: 'Semi-arid / Moderate Deccan Plateau',
    sizeScale: 1.35,
    leadTimeWeeks: 2.0,
    leadTimeReason: 'Direct industrial manufacturing proximity and dense multi-modal rail/expressway links',
    description: 'Major command headquarters ordnance and provisioning hub with highest general scale.',
    coordinates: { lat: 18.5204, lng: 73.8567 }
  },
  {
    id: 'visakhapatnam',
    name: 'Visakhapatnam Naval Store Depot (NSD)',
    shortName: 'Visakhapatnam',
    service: 'Navy',
    command: 'Eastern Naval Command (ENC)',
    state: 'Andhra Pradesh',
    climate: 'Coastal Tropical Marine & Saline',
    sizeScale: 1.20,
    leadTimeWeeks: 2.5,
    leadTimeReason: 'Deep-water seaport logistics with established naval dockyard supply channels',
    description: 'Premier naval store depot catering to eastern fleet warships, submarines, and air squadrons.',
    coordinates: { lat: 17.6868, lng: 83.2185 }
  },
  {
    id: 'kochi',
    name: 'Kochi Naval Store Depot (NSD)',
    shortName: 'Kochi',
    service: 'Navy',
    command: 'Southern Naval Command (SNC)',
    state: 'Kerala',
    climate: 'Tropical Coastal Marine & Severe Monsoon',
    sizeScale: 0.95,
    leadTimeWeeks: 2.5,
    leadTimeReason: 'Direct coastal highway and Arabian Sea maritime shipping lines',
    description: 'Southern naval hub primarily sustaining training fleets, patrol craft, and air stations.',
    coordinates: { lat: 9.9312, lng: 76.2673 }
  },
  {
    id: 'chandigarh',
    name: 'Chandigarh Air Force Logistics Centre',
    shortName: 'Chandigarh',
    service: 'Air Force',
    command: 'Western Air Command (12 Wing Air Logistics Hub)',
    state: 'Chandigarh UT',
    climate: 'Subtropical Continental',
    sizeScale: 1.25,
    leadTimeWeeks: 2.0,
    leadTimeReason: 'Strategic airlift base with direct runway and heavy transport access',
    description: 'Primary air dispatch base executing northern Himalayan air bridges and logistics flights.',
    coordinates: { lat: 30.7333, lng: 76.7794 }
  }
];

export const DEPOT_MAP = Object.fromEntries(DEPOTS.map((d) => [d.id, d]));

/**
 * Validates whether a specific item is realistically stocked by a depot's service branch.
 * - Army depots stock all items except aviation turbine fuel.
 * - Navy depots stock rations, diesel, aviation turbine fuel, lubricants, first-aid kits, IV fluids, batteries and filters.
 * - Air Force depot stocks rations, diesel, aviation turbine fuel, lubricants, first-aid kits, IV fluids, oxygen cylinders, batteries and tyres.
 * 
 * @param {string} service - 'Army' | 'Navy' | 'Air Force'
 * @param {string} itemId - Item unique identifier
 * @returns {boolean}
 */
export function isItemStockedAtDepot(service, itemId) {
  if (service === 'Army') {
    // Army stocks all items except aviation turbine fuel
    return itemId !== 'atf';
  }
  if (service === 'Navy') {
    // Navy stocks rations, diesel, atf, lubricants, first-aid kits, IV fluids, batteries, filters
    const navyItems = [
      'rice', 'atta', 'dal', 'ready-to-eat',
      'diesel', 'atf', 'lubricants',
      'first-aid-kits', 'iv-fluids',
      'batteries', 'filters'
    ];
    return navyItems.includes(itemId);
  }
  if (service === 'Air Force') {
    // Air Force stocks rations, diesel, atf, lubricants, first-aid kits, IV fluids, oxygen cylinders, batteries, tyres
    const airForceItems = [
      'rice', 'atta', 'dal', 'ready-to-eat',
      'diesel', 'atf', 'lubricants',
      'first-aid-kits', 'iv-fluids', 'oxygen-cylinders',
      'batteries', 'tyres'
    ];
    return airForceItems.includes(itemId);
  }
  return false;
}
