
import type { BaseItem, BaseFamiliarComponent } from '@/types';

// NEW: Base definitions for modular familiar components
export interface BaseFamiliarComponent {
  id: string;
  name: string;
  universe: 'Médiéval-Fantastique' | 'Post-Apo' | 'Futuriste' | 'Space-Opéra' | string;
}

export const BASE_FAMILIAR_PHYSICAL_ITEMS: BaseFamiliarComponent[] = [
    { id: 'phy-001', name: 'Collier', universe: 'Médiéval-Fantastique' },
    { id: 'phy-002', name: 'Plume', universe: 'Médiéval-Fantastique' },
    { id: 'phy-003', name: 'Croc', universe: 'Médiéval-Fantastique' },
    { id: 'phy-004', name: 'Griffe', universe: 'Médiéval-Fantastique' },
    { id: 'phy-005', name: 'Orbe', universe: 'Médiéval-Fantastique' },
    { id: 'phy-006', name: 'Puce Électronique', universe: 'Futuriste' },
    { id: 'phy-007', name: 'Réacteur Miniature', universe: 'Futuriste' },
    { id: 'phy-008', name: 'Éclat de Données', universe: 'Futuriste' },
    { id: 'phy-009', name: 'Boulon Rouillé', universe: 'Post-Apo' },
    { id: 'phy-010', name: 'Fragment de Pneu', universe: 'Post-Apo' },
];

export const BASE_FAMILIAR_CREATURES: BaseFamiliarComponent[] = [
    { id: 'cre-001', name: 'Loup', universe: 'Médiéval-Fantastique' },
    { id: 'cre-002', name: 'Faucon', universe: 'Médiéval-Fantastique' },
    { id: 'cre-003', name: 'Chat', universe: 'Médiéval-Fantastique' },
    { id: 'cre-004', name: 'Ours', universe: 'Médiéval-Fantastique' },
    { id: 'cre-005', name: 'Serpent', universe: 'Médiéval-Fantastique' },
    { id: 'cre-006', name: 'Drone', universe: 'Futuriste' },
    { id: 'cre-007', name: 'Androïde', universe: 'Futuriste' },
    { id: 'cre-008', name: 'Cyber-panthère', universe: 'Futuriste' },
    { id: 'cre-009', name: 'Chien Mutant', universe: 'Post-Apo' },
    { id: 'cre-010', name: 'Rat Géant', universe: 'Post-Apo' },
];

export const BASE_FAMILIAR_DESCRIPTORS: BaseFamiliarComponent[] = [
    { id: 'des-001', name: 'Spectral', universe: 'Médiéval-Fantastique' },
    { id: 'des-002', name: 'de Feu', universe: 'Médiéval-Fantastique' },
    { id: 'des-003', name: 'de Glace', universe: 'Médiéval-Fantastique' },
    { id: 'des-004', name: 'Doré', universe: 'Médiéval-Fantastique' },
    { id: 'des-005', name: 'd\'Ombre', universe: 'Médiéval-Fantastique' },
    { id: 'des-006', name: 'Néon', universe: 'Futuriste' },
    { id: 'des-007', name: 'Holographique', universe: 'Futuriste' },
    { id: 'des-008', name: 'Chromé', universe: 'Futuriste' },
    { id: 'des-009', name: 'Toxique', universe: 'Post-Apo' },
    { id: 'des-010', name: 'Enragé', universe: 'Post-Apo' },
];


export const BASE_WEAPONS: BaseItem[] = [
  { id: 'weap-001', name: 'Bâton', description: 'Un simple bâton de bois, utile pour la marche et pour se défendre.', type: 'weapon', damage: '1d6', baseGoldValue: 2, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-002', name: 'Dague', description: 'Une lame courte et rapide, facile à dissimuler.', type: 'weapon', damage: '1d4', baseGoldValue: 2, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-003', name: 'Gourdin', description: 'Une arme contondante simple mais efficace.', type: 'weapon', damage: '1d4', baseGoldValue: 1, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-004', name: 'Hachette', description: 'Une petite hache polyvalente, pour couper du bois ou des ennemis.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-005', name: 'Javeline', description: 'Une lance légère conçue pour être lancée.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-006', name: 'Lance', description: 'Une arme d\'hast avec une bonne allonge.', type: 'weapon', damage: '1d4', baseGoldValue: 1, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-007', name: 'Marteau léger', description: 'Un marteau de guerre maniable.', type: 'weapon', damage: '1d4', baseGoldValue: 2, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-008', name: 'Masse d\'armes', description: 'Une arme contondante conçue pour écraser les armures.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-009', name: 'Massue', description: 'Un gourdin plus lourd et plus menaçant.', type: 'weapon', damage: '1d4', baseGoldValue: 2, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-010', name: 'Serpe', description: 'Une lame incurvée, initialement un outil agricole.', type: 'weapon', damage: '1d4', baseGoldValue: 1, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-011', name: 'Arbalète légère', description: 'Une arbalète facile à recharger mais moins puissante que sa version lourde.', type: 'weapon', damage: '1d6', baseGoldValue: 25, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-012', name: 'Arc court', description: 'Un arc simple pour les tireurs d\'élite mobiles.', type: 'weapon', damage: '1d6', baseGoldValue: 25, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-013', name: 'Fléchette', description: 'Une petite arme de lancer, souvent enduite de poison.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-014', name: 'Fronde', description: 'Une arme simple pour lancer des projectiles contondants.', type: 'weapon', damage: '1d4', baseGoldValue: 1, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-015', name: 'Cimeterre', description: 'Une épée à lame courbe, prisée pour ses coups tranchants.', type: 'weapon', damage: '1d6', baseGoldValue: 25, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-016', name: 'Coutille', description: 'Une arme d\'hast avec une lame de hache et une pointe de lance.', type: 'weapon', damage: '1d6', baseGoldValue: 20, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-017', name: 'Épée à deux mains', description: 'Une immense épée nécessitant les deux mains pour être maniée.', type: 'weapon', damage: '1d9', baseGoldValue: 50, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-018', name: 'Épée courte', description: 'Une lame droite et fiable pour le combat rapproché.', type: 'weapon', damage: '1d5', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-019', name: 'Épée longue', description: 'L\'arme de prédilection de nombreux chevaliers et aventuriers.', type: 'weapon', damage: '1d5', baseGoldValue: 15, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-020', name: 'Fléau d\'armes', description: 'Une arme composée d\'une tête cloutée reliée à un manche par une chaîne.', type: 'weapon', damage: '1d5', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-021', name: 'Fouet', description: 'Une arme exotique capable de désarmer ou de frapper à distance.', type: 'weapon', damage: '1d4', baseGoldValue: 2, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-022', name: 'Hache à deux mains', description: 'Une hache massive capable de fendre un bouclier en deux.', type: 'weapon', damage: '1d6', baseGoldValue: 30, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-023', name: 'Hache d\'armes', description: 'Une hache de guerre équilibrée pour le combat à une main.', type: 'weapon', damage: '1d5', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-024', name: 'Hallebarde', description: 'Une arme d\'hast polyvalente avec une pointe de lance et une lame de hache.', type: 'weapon', damage: '1d6', baseGoldValue: 20, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-025', name: 'Lance d’arçon', description: 'Une longue lance utilisée principalement à cheval.', type: 'weapon', damage: '1d5', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-026', name: 'Maillet', description: 'Un grand marteau en bois, étonnamment efficace.', type: 'weapon', damage: '1d5', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-027', name: 'Marteau de guerre', description: 'Conçu pour percer les armures les plus épaisses.', type: 'weapon', damage: '1d5', baseGoldValue: 15, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-028', name: 'Morgenstern', description: 'Une masse à pointes, terrifiante et brutale.', type: 'weapon', damage: '1d5', baseGoldValue: 15, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-029', name: 'Pic de guerre', description: 'Une arme conçue pour perforer les armures avec sa pointe acérée.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-030', name: 'Pique', description: 'Une très longue lance, idéale pour tenir les ennemis à distance.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-031', name: 'Rapière', description: 'Une épée fine et légère, parfaite pour l\'escrime et les coups d\'estoc.', type: 'weapon', damage: '1d6', baseGoldValue: 25, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-032', name: 'Trident', description: 'Une lance à trois pointes, aussi bien utilisée par les pêcheurs que par les gladiateurs.', type: 'weapon', damage: '1d4', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-033', name: 'Arbalète de poing', description: 'Une petite arbalète qui peut être utilisée d\'une seule main.', type: 'weapon', damage: '2d5', baseGoldValue: 75, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-034', name: 'Arbalète lourde', description: 'Une arme puissante mais lente à recharger, capable de perforer des armures.', type: 'weapon', damage: '1d9', baseGoldValue: 50, universe: 'Médiéval-Fantastique', rarity: 'Légendaire' },
  { id: 'weap-035', name: 'Arc long', description: 'Un grand arc puissant qui demande de la force pour être utilisé efficacement.', type: 'weapon', damage: '1d9', baseGoldValue: 50, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
  { id: 'weap-036', name: 'Filet', description: 'Une arme non létale utilisée pour entraver un adversaire.', type: 'weapon', damage: '1d4', baseGoldValue: 1, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
  { id: 'weap-037', name: 'Sarbacane', description: 'Un tube utilisé pour souffler de petites fléchettes, souvent empoisonnées.', type: 'weapon', damage: '1d5', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
  { id: 'weap-038', name: 'Lame des Abysses', description: 'Une épée forgée dans les feux infernaux, murmurant des promesses de pouvoir.', type: 'weapon', damage: '2d10', baseGoldValue: 2000, universe: 'Médiéval-Fantastique', rarity: 'Divin' },
  { id: 'weap-039', name: 'Glaive du Firmament', description: 'Une arme d\'hast qui semble taillée dans un éclat d\'étoile.', type: 'weapon', damage: '3d6', baseGoldValue: 2500, universe: 'Médiéval-Fantastique', rarity: 'Divin' },
];

export const BASE_ARMORS: BaseItem[] = [
    // Armures légères
    { id: 'arm-001', name: 'Armure matelassée', description: 'Plusieurs couches de tissu matelassé.', type: 'armor', ac: '11 + Mod.Dex', baseGoldValue: 5, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
    { id: 'arm-002', name: 'Armure de cuir', description: 'Une armure faite de cuir traité.', type: 'armor', ac: '11 + Mod.Dex', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
    { id: 'arm-003', name: 'Armure de cuir clouté', description: 'Cuir renforcé par des rivets de métal.', type: 'armor', ac: '12 + Mod.Dex', baseGoldValue: 45, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
    // Armures intermédiaires
    { id: 'arm-004', name: 'Armure de peaux', description: 'Faite de peaux épaisses d\'animaux.', type: 'armor', ac: '12 + Mod.Dex (max +2)', baseGoldValue: 10, universe: 'Médiéval-Fantastique', rarity: 'Commun' },
    { id: 'arm-005', name: 'Chemise de mailles', description: 'Une chemise faite d\'anneaux de métal entrelacés.', type: 'armor', ac: '13 + Mod.Dex (max +2)', baseGoldValue: 50, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
    { id: 'arm-006', name: 'Armure d\'écailles', description: 'Une cotte de cuir sur laquelle sont cousues des écailles de métal.', type: 'armor', ac: '14 + Mod.Dex (max +2)', baseGoldValue: 50, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
    { id: 'arm-007', name: 'Cuirasse', description: 'Un plastron de métal protégeant le torse.', type: 'armor', ac: '14 + Mod.Dex (max +2)', baseGoldValue: 400, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
    { id: 'arm-008', name: 'Demi-plate', description: 'Combine des plaques de métal avec une cotte de mailles flexible.', type: 'armor', ac: '15 + Mod.Dex (max +2)', baseGoldValue: 750, universe: 'Médiéval-Fantastique', rarity: 'Légendaire' },
    // Armures lourdes
    { id: 'arm-009', name: 'Broigne', description: 'Des anneaux de métal cousus sur du cuir.', type: 'armor', ac: '14', baseGoldValue: 30, universe: 'Médiéval-Fantastique', rarity: 'Rare' },
    { id: 'arm-010', name: 'Cotte de mailles', description: 'Une armure complète d\'anneaux de métal entrelacés.', type: 'armor', ac: '16', baseGoldValue: 75, universe: 'Médiéval-Fantastique', rarity: 'Epique' },
    { id: 'arm-011', name: 'Clibanion', description: 'Des bandes de métal qui se chevauchent.', type: 'armor', ac: '17', baseGoldValue: 200, universe: 'Médiéval-Fantastique', rarity: 'Légendaire' },
    { id: 'arm-012', name: 'Harnois', description: 'L\'armure de plaques complète, summum de la protection.', type: 'armor', ac: '18', baseGoldValue: 1500, universe: 'Médiéval-Fantastique', rarity: 'Divin' },
    { id: 'arm-013', name: 'Armure des Titans', description: 'Une armure forgée dans un métal céleste, offrant une protection quasi divine.', type: 'armor', ac: '20', baseGoldValue: 5000, universe: 'Médiéval-Fantastique', rarity: 'Divin' },
];

const STAT_JEWELRY: BaseItem[] = [];
const stats: Array<{ key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', name: string }> = [
    { key: 'str', name: 'Force' },
    { key: 'dex', name: 'Dextérité' },
    { key: 'con', name: 'Constitution' },
    { key: 'int', name: 'Intelligence' },
    { key: 'wis', name: 'Sagesse' },
    { key: 'cha', name: 'Charisme' },
];
const rarities: Array<{ rarity: 'Commun' | 'Rare' | 'Epique' | 'Légendaire' | 'Divin', bonus: number, value: number, itemType: 'Amulette' | 'Anneau' }> = [
    { rarity: 'Commun', bonus: 1, value: 5, itemType: 'Amulette' },
    { rarity: 'Rare', bonus: 2, value: 25, itemType: 'Anneau' },
    { rarity: 'Epique', bonus: 3, value: 100, itemType: 'Amulette' },
    { rarity: 'Légendaire', bonus: 4, value: 500, itemType: 'Anneau' },
    { rarity: 'Divin', bonus: 5, value: 1000, itemType: 'Amulette' },
];

stats.forEach(stat => {
    rarities.forEach(({ rarity, bonus, value, itemType }) => {
        STAT_JEWELRY.push({
            id: `jew-stat-${stat.key}-${rarity.charAt(0).toLowerCase()}`,
            name: `${itemType} de ${stat.name}`,
            description: `Cet objet augmente votre ${stat.name}.`,
            type: 'jewelry',
            rarity: rarity,
            baseGoldValue: value,
            universe: 'Médiéval-Fantastique',
            effectType: 'stat',
            statBonuses: { [stat.key]: bonus },
        });
    });
});


export const BASE_JEWELRY: BaseItem[] = [
    // Narrative Jewelry
    { id: 'jew-narr-001', name: 'Anneau de barrière mentale', description: "Vous êtes immunisé aux magies qui permettent à d'autres créatures de lire dans vos pensées.", type: 'jewelry', rarity: 'Rare', baseGoldValue: 25, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-002', name: 'Anneau de marche sur l\'eau', description: "Vous pouvez vous déplacer sur les surfaces liquides comme si vous étiez sur la terre ferme.", type: 'jewelry', rarity: 'Rare', baseGoldValue: 25, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-003', name: 'Anneau de rayons X', description: "Vous pouvez voir à l'intérieur et au travers des matières solides.", type: 'jewelry', rarity: 'Rare', baseGoldValue: 25, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-004', name: 'Amulette de bonne santé', description: "Votre Constitution passe à 19 tant que vous portez cette amulette. N'a aucun effet si votre Constitution est déjà de 19 ou plus.", type: 'jewelry', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-005', name: 'Anneau de télékinésie', description: "Vous pouvez utiliser la télékinésie et déplacer des objets par la pensée.", type: 'jewelry', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-006', name: 'Anneau d\'invisibilité', description: "Vous pouvez devenir invisible.", type: 'jewelry', rarity: 'Légendaire', baseGoldValue: 500, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-007', name: 'Anneau de convocation de djinn', description: "Prononcez son mot de commande pour invoquer un djinn qui obéira à vos ordres.", type: 'jewelry', rarity: 'Divin', baseGoldValue: 1000, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'jew-narr-008', name: 'Anneau de séduction', description: "Facilité de séduction lors des échanges avec le genre opposer.", type: 'jewelry', rarity: 'Epique', baseGoldValue: 200, universe: 'Médiéval-Fantastique', effectType: 'narrative' },

    // Stat Jewelry
    ...STAT_JEWELRY,

    // HP Jewelry
    { id: 'jew-stat-hp-c', name: 'Amulette de vitalité', description: 'Augmente légèrement vos points de vie maximum.', type: 'jewelry', rarity: 'Commun', baseGoldValue: 5, universe: 'Médiéval-Fantastique', effectType: 'stat', statBonuses: { hp: 5 } },
    { id: 'jew-stat-hp-r', name: 'Anneau de vitalité', description: 'Augmente vos points de vie maximum.', type: 'jewelry', rarity: 'Rare', baseGoldValue: 25, universe: 'Médiéval-Fantastique', effectType: 'stat', statBonuses: { hp: 10 } },
    { id: 'jew-stat-hp-e', name: 'Amulette de vitalité', description: 'Augmente considérablement vos points de vie maximum.', type: 'jewelry', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'stat', statBonuses: { hp: 20 } },
];

export const BASE_CONSUMABLES: BaseItem[] = [
    // Narrative Potions & Scrolls
    { id: 'cons-narr-001', name: 'Potion de respiration aquatique', description: 'Vous pouvez respirer sous l\'eau.', type: 'consumable', rarity: 'Rare', baseGoldValue: 25, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'cons-narr-002', name: 'Parchemin de lecture des pensées', description: 'Vous bénéficiez de la capacité à lire les pensées.', type: 'consumable', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'cons-narr-003', name: 'Potion de forme gazeuse', description: 'Votre corps se transforme en une forme gazeuse.', type: 'consumable', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'cons-narr-004', name: 'Potion de diminution', description: 'Vous devenez minuscule.', type: 'consumable', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'cons-narr-005', name: 'Parchemin d\'invisibilité', description: 'Vous pouvez devenir invisible.', type: 'consumable', rarity: 'Légendaire', baseGoldValue: 500, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
    { id: 'cons-narr-006', name: 'Potion d\'amitié avec les animaux', description: 'Vous pouvez communiquer avec un animal.', type: 'consumable', rarity: 'Epique', baseGoldValue: 100, universe: 'Médiéval-Fantastique', effectType: 'narrative' },
  
    // Healing Potions
    ...(['Commun', 'Rare', 'Epique', 'Légendaire', 'Divin'] as const).map(rarity => {
      const values = { 'Commun': 10, 'Rare': 15, 'Epique': 25, 'Légendaire': 50, 'Divin': 2000 };
      const prices = { 'Commun': 5, 'Rare': 25, 'Epique': 100, 'Légendaire': 500, 'Divin': 1000 };
      return {
        id: `cons-combat-heal-${rarity.toLowerCase()}`,
        name: `Potion de guérison`,
        description: `Restaure ${values[rarity]} PV.`,
        type: 'consumable',
        rarity: rarity,
        baseGoldValue: prices[rarity],
        universe: 'Médiéval-Fantastique',
        effectType: 'combat',
        effectDetails: { type: 'heal', amount: values[rarity] }
      } as BaseItem
    }),
  
    // Fireball Scrolls
    ...(['Commun', 'Rare', 'Epique', 'Légendaire', 'Divin'] as const).map(rarity => {
      const values = { 'Commun': 5, 'Rare': 15, 'Epique': 25, 'Légendaire': 50, 'Divin': 5000 };
      const prices = { 'Commun': 5, 'Rare': 25, 'Epique': 100, 'Légendaire': 500, 'Divin': 1000 };
      return {
        id: `cons-combat-fireball-${rarity.toLowerCase()}`,
        name: `Parchemin de boule de feu`,
        description: `Provoque ${values[rarity]} dégâts à un ennemi.`,
        type: 'consumable',
        rarity: rarity,
        baseGoldValue: prices[rarity],
        universe: 'Médiéval-Fantastique',
        effectType: 'combat',
        effectDetails: { type: 'damage_single', amount: values[rarity] }
      } as BaseItem
    }),
  
    // Wind Scrolls
    ...(['Commun', 'Rare', 'Epique', 'Légendaire', 'Divin'] as const).map(rarity => {
      const values = { 'Commun': 2, 'Rare': 5, 'Epique': 15, 'Légendaire': 25, 'Divin': 100 };
      const prices = { 'Commun': 5, 'Rare': 25, 'Epique': 100, 'Légendaire': 500, 'Divin': 1000 };
      return {
        id: `cons-combat-wind-${rarity.toLowerCase()}`,
        name: `Parchemin de vent`,
        description: `Provoque ${values[rarity]} dégâts à tous les ennemis.`,
        type: 'consumable',
        rarity: rarity,
        baseGoldValue: prices[rarity],
        universe: 'Médiéval-Fantastique',
        effectType: 'combat',
        effectDetails: { type: 'damage_all', amount: values[rarity] }
      } as BaseItem
    }),
];
    

    