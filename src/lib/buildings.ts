// src/lib/buildings.ts

import type { MapPointOfInterest, GeneratedResource } from "@/types";

export interface BuildingDefinition {
  id: string; // e.g. 'blacksmith'
  name: string;
  description: string;
  applicablePoiTypes: Array<MapPointOfInterest['icon']>;
  // Cost is handled dynamically by BUILDING_COST_PROGRESSION
}

export const BUILDING_DEFINITIONS: BuildingDefinition[] = [
  {
    id: 'forgeron',
    name: "Forgeron",
    description: "Permet l'achat d'armes et d'armures.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'bijoutier',
    name: "Bijoutier",
    description: "Permet l'achat de bijoux et d'amulettes.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'magicien',
    name: "Tour de Magicien",
    description: "Permet l'achat de parchemins, de potions et d'objets magiques.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'bureau-comptes',
    name: "Bureau des Comptes",
    description: "Augmente les revenus en or de ce lieu de 25%.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'maison',
    name: "Maison d'Habitation",
    description: "Augmente la population et le prestige de votre ville. (Immersif)",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'quartier-esclaves',
    name: "Marché aux Esclaves",
    description: "Permet d'acheter des alliés pour renforcer vos rangs.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'auberge',
    name: "Auberge",
    description: "Permet de se reposer, de recruter des aventuriers et d'entendre des rumeurs.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'chambre-guildes',
    name: "Chambre des Guildes",
    description: "Débloque des missions et des contrats spéciaux. (Fonctionnalité future)",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'poste-gardes',
    name: "Poste de Gardes",
    description: "Réduit les chances de rencontres hostiles lors des voyages vers ce lieu.",
    applicablePoiTypes: ['Village'],
  },
  {
    id: 'poste-guerisseur',
    name: "Poste de Guérisseur",
    description: "Permet de ressusciter les alliés tombés au combat contre de l'or.",
    applicablePoiTypes: ['Village'],
  },
  // Future buildings for other POI types can be added here
];

// Le coût du N-ième bâtiment. (index 0 = 1er bâtiment, etc.)
export const BUILDING_COST_PROGRESSION: number[] = [
    50, 100, 200, 400, 800
];

// Nombre de slots de bâtiment débloqués par niveau de POI
export const BUILDING_SLOTS: Record<MapPointOfInterest['icon'], number[]> = {
    Village: [0, 1, 1, 2, 2, 3, 5], // index 0 is placeholder, level 1 gives 1 slot, level 2 gives 1...
    Trees: [0, 0, 1, 2],
    Shield: [0, 0, 1, 2],
    // Other types have 0 slots for now
    Castle: [0, 0, 0, 0, 0, 0],
    Mountain: [0, 0, 0, 0, 0, 0],
    Landmark: [0, 0, 0, 0, 0, 0],
};

export const poiLevelConfig: Record<string, Record<number, { name: string; upgradeCost: number | null; resources: GeneratedResource[] }>> = {
    Village: {
        1: { name: 'Village', upgradeCost: 50, resources: [{ type: 'currency', name: "Pièces d'Or (Taxes)", quantity: 10 }] },
        2: { name: 'Bourg', upgradeCost: 200, resources: [{ type: 'currency', name: "Pièces d'Or (Taxes)", quantity: 25 }] },
        3: { name: 'Petite Ville', upgradeCost: 500, resources: [{ type: 'currency', name: "Pièces d'Or (Taxes)", quantity: 50 }] },
        4: { name: 'Ville Moyenne', upgradeCost: 1000, resources: [{ type: 'currency', name: "Pièces d'Or (Taxes)", quantity: 100 }] },
        5: { name: 'Grande Ville', upgradeCost: 2500, resources: [{ type: 'currency', name: "Pièces d'Or (Taxes)", quantity: 200 }] },
        6: { name: 'Métropole', upgradeCost: null, resources: [{ type: 'currency', name: "Pièces d'Or (Taxes)", quantity: 350 }] },
    },
    Trees: { // Forêt
        1: { name: 'Petite Forêt', upgradeCost: 100, resources: [{ type: 'item', name: "Bois", quantity: 5 }, { type: 'item', name: "Viande", quantity: 2 }] },
        2: { name: 'Forêt Moyenne', upgradeCost: 500, resources: [{ type: 'item', name: "Bois", quantity: 12 }, { type: 'item', name: "Viande", quantity: 5 }] },
        3: { name: 'Grande Forêt', upgradeCost: null, resources: [{ type: 'item', name: "Bois", quantity: 25 }, { type: 'item', name: "Viande", quantity: 10 }] },
    },
    Shield: { // Mine
        1: { name: 'Petite Mine', upgradeCost: 100, resources: [{ type: 'item', name: "Minerai de Fer", quantity: 3 }] },
        2: { name: 'Mine Moyenne', upgradeCost: 500, resources: [{ type: 'item', name: "Minerai de Fer", quantity: 8 }, { type: 'item', name: "Charbon", quantity: 5 }] },
        3: { name: 'Grande Mine', upgradeCost: null, resources: [{ type: 'item', name: "Minerai de Fer", quantity: 15 }, { type: 'item', name: "Charbon", quantity: 10 }, { type: 'item', name: "Gemmes", quantity: 1 }] },
    }
};

export const poiLevelNameMap: Record<string, Record<number, string>> = {
    Village: {
        1: 'Village',
        2: 'Bourg',
        3: 'Petite Ville',
        4: 'Ville Moyenne',
        5: 'Grande Ville',
        6: 'Métropole',
    },
    Trees: {
        1: 'Petite Forêt',
        2: 'Forêt Moyenne',
        3: 'Grande Forêt',
    },
    Shield: {
        1: 'Petite Mine',
        2: 'Mine Moyenne',
        3: 'Grande Mine',
    }
};
