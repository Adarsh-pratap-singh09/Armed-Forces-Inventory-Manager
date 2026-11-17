/**
 * Illustrative Supply Items Catalog
 * 
 * NOTE: All item names, specifications, numbers, and parameters in this project
 * are illustrative and synthetic for academic research. No ammunition or weapons
 * are included.
 * 
 * 14 items categorized into 5 operational classes:
 * 1. Rations (4): Rice, Atta, Dal, Ready-to-Eat (RTE)
 * 2. POL (3): Diesel, Aviation Turbine Fuel (ATF), Lubricants
 * 3. Medical (3): First-Aid Kits, IV Fluids, Oxygen Cylinders
 * 4. Vehicle spares (3): Tyres, Batteries, Filters
 * 5. Special clothing (1): Extreme Cold Weather Sets (ECWCS)
 */

export const CATEGORIES = [
  'Rations',
  'POL',
  'Medical',
  'Vehicle spares',
  'Special clothing'
];

export const ITEMS = [
  // --- Category 1: Rations ---
  {
    id: 'rice',
    name: 'Rice (fortified and basmati)',
    shortName: 'Rice',
    category: 'Rations',
    unit: 'Bags (50 kg)',
    baseWeeklyDemand: 220,
    unitCostINR: 2400,
    shelfLifeWeeks: 52,
    description: 'Core grain ration staple supplied in moisture-resistant 50kg bags.'
  },
  {
    id: 'atta',
    name: 'Atta (whole wheat flour)',
    shortName: 'Atta',
    category: 'Rations',
    unit: 'Bags (50 kg)',
    baseWeeklyDemand: 200,
    unitCostINR: 1950,
    shelfLifeWeeks: 26,
    description: 'Whole wheat flour packed in moisture barrier bags for troop mess provisioning.'
  },
  {
    id: 'dal',
    name: 'Dal (assorted pulses and lentils)',
    shortName: 'Dal',
    category: 'Rations',
    unit: 'Bags (50 kg)',
    baseWeeklyDemand: 130,
    unitCostINR: 4800,
    shelfLifeWeeks: 52,
    description: 'Protein staple (chana, arhar, moong) vital for balanced field nutrition.'
  },
  {
    id: 'ready-to-eat',
    name: 'Ready-to-eat rations (retort meal cartons)',
    shortName: 'Ready-to-eat',
    category: 'Rations',
    unit: 'Cartons (10 meals)',
    baseWeeklyDemand: 90,
    unitCostINR: 3500,
    shelfLifeWeeks: 78,
    description: 'Self-heating retort pouch meal packs designed for patrols and forward deployments.'
  },

  // --- Category 2: POL (Petroleum, Oils, Lubricants) ---
  {
    id: 'diesel',
    name: 'Diesel (high-speed / winter grade)',
    shortName: 'Diesel',
    category: 'POL',
    unit: 'Kilolitres (kL)',
    baseWeeklyDemand: 160,
    unitCostINR: 92000,
    shelfLifeWeeks: 104,
    description: 'Transport and heating fuel; winter-grade diesel (-35°C rating) used in high-altitude depots.'
  },
  {
    id: 'atf',
    name: 'Aviation turbine fuel (ATF)',
    shortName: 'Aviation turbine fuel',
    category: 'POL',
    unit: 'Kilolitres (kL)',
    baseWeeklyDemand: 180,
    unitCostINR: 115000,
    shelfLifeWeeks: 104,
    description: 'Aviation turbine fuel for transport aircraft, multirole fighters, and helicopter airlift.'
  },
  {
    id: 'lubricants',
    name: 'Engine oils and lubricants',
    shortName: 'Lubricants',
    category: 'POL',
    unit: 'Barrels (200 L)',
    baseWeeklyDemand: 60,
    unitCostINR: 38000,
    shelfLifeWeeks: 156,
    description: 'Multi-grade synthetic and mineral transmission oils and lubricants.'
  },

  // --- Category 3: Medical ---
  {
    id: 'first-aid-kits',
    name: 'First-aid kits (tactical casualty care)',
    shortName: 'First-aid kits',
    category: 'Medical',
    unit: 'Kits',
    baseWeeklyDemand: 75,
    unitCostINR: 4200,
    shelfLifeWeeks: 104,
    description: 'Individual first-aid kits containing dressings, tourniquets, bandages, and burn care.'
  },
  {
    id: 'iv-fluids',
    name: 'IV fluids (normal saline and RL)',
    shortName: 'IV fluids',
    category: 'Medical',
    unit: 'Cases (24 bottles)',
    baseWeeklyDemand: 90,
    unitCostINR: 1680,
    shelfLifeWeeks: 104,
    description: 'Intravenous rehydration solutions; sharp demand rise during monsoon and hydration peaks.'
  },
  {
    id: 'oxygen-cylinders',
    name: 'Oxygen cylinders (medical D-type 47L)',
    shortName: 'Oxygen cylinders',
    category: 'Medical',
    unit: 'Cylinders',
    baseWeeklyDemand: 50,
    unitCostINR: 6500,
    shelfLifeWeeks: 208,
    description: 'Pressurized medical oxygen for high-altitude hypoxia therapy and medical posts.'
  },

  // --- Category 4: Vehicle spares ---
  {
    id: 'tyres',
    name: 'Tyres (all-terrain heavy vehicle)',
    shortName: 'Tyres',
    category: 'Vehicle spares',
    unit: 'Sets (pair)',
    baseWeeklyDemand: 45,
    unitCostINR: 44000,
    shelfLifeWeeks: 208,
    description: 'Reinforced run-flat off-road tyres rated for stony mountain and hot desert terrain.'
  },
  {
    id: 'batteries',
    name: 'Batteries (24V heavy duty starter)',
    shortName: 'Batteries',
    category: 'Vehicle spares',
    unit: 'Units',
    baseWeeklyDemand: 40,
    unitCostINR: 14500,
    shelfLifeWeeks: 78,
    description: 'Cold-cranking military starter batteries; high winter drain in sub-zero climates.'
  },
  {
    id: 'filters',
    name: 'Filters (engine air, fuel and oil kits)',
    shortName: 'Filters',
    category: 'Vehicle spares',
    unit: 'Sets',
    baseWeeklyDemand: 80,
    unitCostINR: 5200,
    shelfLifeWeeks: 156,
    description: 'Preventative maintenance filter kits; high consumption in arid desert dust.'
  },

  // --- Category 5: Special clothing ---
  {
    id: 'ecwcs',
    name: 'Extreme cold weather clothing sets (ECWCS)',
    shortName: 'Extreme cold weather sets',
    category: 'Special clothing',
    unit: 'Sets',
    baseWeeklyDemand: 50,
    unitCostINR: 32000,
    shelfLifeWeeks: 208,
    description: 'Multi-layer thermal outerwear, windcheaters, balaclavas, and glacier boots.'
  }
];

export const ITEM_MAP = Object.fromEntries(ITEMS.map((item) => [item.id, item]));
