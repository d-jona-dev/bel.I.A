
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, PlayerSkill, Combatant, MapPointOfInterest, GeneratedResource, Familiar, FamiliarPassiveBonus, AiConfig, ImageTransform, PlayerAvatar, TimeManagementSettings, ComicPage, Panel, Bubble, SellingItem, BaseItem } from "@/types";
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureFlowOutput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema, NewFamiliarSchema } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageFlowOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";
import { suggestPlayerSkill } from "@/ai/flows/suggest-player-skill";
import type { SuggestPlayerSkillInput, SuggestPlayerSkillFlowOutput } from "@/ai/flows/suggest-player-skill";
import { BUILDING_DEFINITIONS, BUILDING_SLOTS, BUILDING_COST_PROGRESSION, poiLevelConfig, poiLevelNameMap } from "@/lib/buildings";
import { AdventureForm, type AdventureFormValues, type AdventureFormHandle, type FormCharacterDefinition } from '@/components/adventure-form';
import ImageEditor, { compressImage } from "@/components/ImageEditor";
import { createNewPage as createNewComicPage, exportPageAsJpeg } from "@/components/ComicPageEditor";
import { BASE_WEAPONS, BASE_ARMORS, BASE_JEWELRY, BASE_CONSUMABLES } from "@/lib/items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";


const PLAYER_ID = "player";
const BASE_ATTRIBUTE_VALUE = 8;
const INITIAL_CREATION_ATTRIBUTE_POINTS_PLAYER = 10; // For player
const INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT = 5; // Default for NPCs
const ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM = 5;

// Calculates base stats derived from attributes, before equipment
const calculateBaseDerivedStats = (settings: Partial<AdventureSettings & Character>) => {
  const constitution = settings.constitution || settings.playerConstitution || BASE_ATTRIBUTE_VALUE;
  const intelligence = settings.intelligence || settings.playerIntelligence || BASE_ATTRIBUTE_VALUE;
  const dexterity = settings.dexterity || settings.playerDexterity || BASE_ATTRIBUTE_VALUE;
  const strength = settings.strength || settings.playerStrength || BASE_ATTRIBUTE_VALUE;
  const charClass = settings.characterClass || settings.playerClass || ""; // Use characterClass for NPC, playerClass for player
  const level = settings.level || settings.playerLevel || 1;


  let maxHp = 10 + (Math.floor((constitution - 10) / 2) + constitution) * level;
  if (charClass.toLowerCase().includes("guerrier") || charClass.toLowerCase().includes("barbare")) {
    maxHp += level * 2;
  } else if (charClass.toLowerCase().includes("mage") || charClass.toLowerCase().includes("sorcier") || charClass.toLowerCase().includes("étudiant")) {
    maxHp -= level * 1;
  }

  let maxMp = 0;
  if (charClass.toLowerCase().includes("magicien") || charClass.toLowerCase().includes("mage") || charClass.toLowerCase().includes("sorcier") || charClass.toLowerCase().includes("étudiant")) {
    maxMp = 10 + Math.max(0, (intelligence - 10)) * 2 + Math.floor(level / 2) * 5;
  }

  const baseArmorClass = 10 + Math.floor((dexterity - 10) / 2);
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2;
  const baseAttackBonus = Math.floor(((strength) - 10) / 2) + proficiencyBonus;

  const strengthModifierValue = Math.floor(((strength) - 10) / 2);
  let baseDamageBonusString = "1"; // Base damage for unarmed
  if (strengthModifierValue > 0) {
    baseDamageBonusString = `1+${strengthModifierValue}`;
  } else if (strengthModifierValue < 0) {
     baseDamageBonusString = `1${strengthModifierValue}`;
  }


  return {
    maxHitPoints: Math.max(5, maxHp),
    maxManaPoints: Math.max(0, maxMp),
    armorClass: baseArmorClass,
    attackBonus: baseAttackBonus,
    damageBonus: baseDamageBonusString,
  };
};

// Calculates effective stats including equipment (PLAYER ONLY FOR NOW)
const calculateEffectiveStats = (settings: AdventureSettings) => {
    let effectiveStrength = settings.playerStrength || BASE_ATTRIBUTE_VALUE;
    let effectiveDexterity = settings.playerDexterity || BASE_ATTRIBUTE_VALUE;
    let effectiveConstitution = settings.playerConstitution || BASE_ATTRIBUTE_VALUE;
    let effectiveIntelligence = settings.playerIntelligence || BASE_ATTRIBUTE_VALUE;
    let effectiveWisdom = settings.playerWisdom || BASE_ATTRIBUTE_VALUE;
    let effectiveCharisma = settings.playerCharisma || BASE_ATTRIBUTE_VALUE;
    
    const activeFamiliar = settings.familiars?.find(f => f.isActive);
    if (activeFamiliar) {
        const bonus = activeFamiliar.passiveBonus;
        const bonusValue = Math.floor(bonus.value * (activeFamiliar.level || 1));
        if (bonus.type === 'strength') effectiveStrength += bonusValue;
        if (bonus.type === 'dexterity') effectiveDexterity += bonusValue;
        if (bonus.type === 'constitution') effectiveConstitution += bonusValue;
        if (bonus.type === 'intelligence') effectiveIntelligence += bonusValue;
        if (bonus.type === 'wisdom') effectiveWisdom += bonusValue;
        if (bonus.type === 'charisma') effectiveCharisma += bonusValue;
    }

    const inventory = settings.playerInventory || [];
    const equippedJewelry = settings.equippedItemIds?.jewelry ? inventory.find(item => item.id === settings.equippedItemIds?.jewelry) : null;

    if (equippedJewelry?.statBonuses?.str) effectiveStrength += equippedJewelry.statBonuses.str;
    if (equippedJewelry?.statBonuses?.dex) effectiveDexterity += equippedJewelry.statBonuses.dex;
    if (equippedJewelry?.statBonuses?.con) effectiveConstitution += equippedJewelry.statBonuses.con;
    if (equippedJewelry?.statBonuses?.int) effectiveIntelligence += equippedJewelry.statBonuses.int;
    if (equippedJewelry?.statBonuses?.wis) effectiveWisdom += equippedJewelry.statBonuses.wis;
    if (equippedJewelry?.statBonuses?.cha) effectiveCharisma += equippedJewelry.statBonuses.cha;

    const basePlayerStats = {
        strength: effectiveStrength,
        dexterity: effectiveDexterity,
        constitution: effectiveConstitution,
        intelligence: effectiveIntelligence,
        playerClass: settings.playerClass,
        playerLevel: settings.playerLevel,
    };
    const baseDerived = calculateBaseDerivedStats(basePlayerStats as any);
    let effectiveMaxHp = baseDerived.maxHitPoints;

    if (equippedJewelry?.statBonuses?.hp) {
        effectiveMaxHp += equippedJewelry.statBonuses.hp;
    }


    const agileAC = 10 + Math.floor((effectiveDexterity - 10) / 2);
    let armorBasedAC = 0;
    
    if (activeFamiliar) {
        const bonus = activeFamiliar.passiveBonus;
        const bonusValue = Math.floor(bonus.value * (activeFamiliar.level || 1));
        if (bonus.type === 'armor_class') armorBasedAC += bonusValue;
    }

    const armorId = settings.equippedItemIds?.armor;
    const equippedArmor = armorId ? inventory.find(item => item.id === armorId) : null;

    if (equippedArmor) {
        let baseACFromArmor = 0;
        if (equippedArmor.ac?.includes('+')) {
            const baseAC = parseInt(equippedArmor.ac, 10);
            const dexMod = Math.floor((effectiveDexterity - 10) / 2);
            
            let maxDex = Infinity;
            const maxMatch = equippedArmor.ac.match(/\(max \+(\d+)\)/);
            if (maxMatch) {
                maxDex = parseInt(maxMatch[1], 10);
            }
            
            baseACFromArmor = baseAC + Math.min(dexMod, maxDex);
        } else if (equippedArmor.ac) {
            baseACFromArmor = parseInt(equippedArmor.ac, 10);
        }
        
        let bonusAC = 0;
        if (equippedArmor?.statBonuses?.ac) {
             bonusAC = equippedArmor.statBonuses.ac;
        }

        armorBasedAC += (baseACFromArmor + bonusAC);
    }
   
    if (equippedJewelry?.statBonuses?.ac) {
        armorBasedAC += equippedJewelry.statBonuses.ac;
    }

    const effectiveAC = Math.max(agileAC, armorBasedAC);
    let effectiveAttackBonus = baseDerived.attackBonus;
    
    if (activeFamiliar) {
        const bonus = activeFamiliar.passiveBonus;
        const bonusValue = Math.floor(bonus.value * (activeFamiliar.level || 1));
        if (bonus.type === 'attack_bonus') effectiveAttackBonus += bonusValue;
    }

    const weaponId = settings.equippedItemIds?.weapon;
    const equippedWeapon = weaponId ? inventory.find(item => item.id === weaponId) : null;

    if (equippedWeapon?.statBonuses?.attack) {
        effectiveAttackBonus += equippedWeapon.statBonuses.attack;
    }
    if (equippedJewelry?.statBonuses?.attack) {
        effectiveAttackBonus += equippedJewelry.statBonuses.attack;
    }

    const strengthModifierValue = Math.floor((effectiveStrength - 10) / 2);
    let weaponDamageDice = equippedWeapon?.damage;
    let effectiveDamageBonus = baseDerived.damageBonus;
    
    if (equippedWeapon && weaponDamageDice) {
        let bonusFromStrength = strengthModifierValue;
        if (equippedWeapon.statBonuses?.damage?.startsWith('+')) {
           bonusFromStrength += parseInt(equippedWeapon.statBonuses.damage.substring(1), 10);
        }
        
        effectiveDamageBonus = weaponDamageDice;
        if (bonusFromStrength > 0) {
            effectiveDamageBonus = `${weaponDamageDice}+${bonusFromStrength}`;
        } else if (bonusFromStrength < 0) {
            effectiveDamageBonus = `${weaponDamageDice}${bonusFromStrength}`;
        }
    }


    return {
        playerMaxHp: effectiveMaxHp,
        playerMaxMp: baseDerived.maxManaPoints,
        playerArmorClass: effectiveAC,
        playerAttackBonus: effectiveAttackBonus,
        playerDamageBonus: effectiveDamageBonus,
        playerStrength: effectiveStrength,
        playerDexterity: effectiveDexterity,
        playerConstitution: effectiveConstitution,
        playerIntelligence: effectiveIntelligence,
        playerWisdom: effectiveWisdom,
        playerCharisma: effectiveCharisma,
    };
};

export interface SellingItemDetails {
  item: PlayerInventoryItem;
  sellPricePerUnit: number;
}

const uid = (n = 6) => Math.random().toString(36).slice(2, 2 + n);


// Function to create a clean, default state
const createInitialState = (): { settings: AdventureSettings; characters: Character[]; narrative: Message[], aiConfig: AiConfig } => {
    const initialPlayerAttributes = {
      playerInitialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS_PLAYER,
      playerStrength: BASE_ATTRIBUTE_VALUE,
      playerDexterity: BASE_ATTRIBUTE_VALUE,
      playerConstitution: BASE_ATTRIBUTE_VALUE,
      playerIntelligence: BASE_ATTRIBUTE_VALUE,
      playerWisdom: BASE_ATTRIBUTE_VALUE,
      playerCharisma: BASE_ATTRIBUTE_VALUE,
    };
  
    const initialBaseDerivedStats = calculateEffectiveStats({
      ...initialPlayerAttributes,
      playerName: "Héros",
      playerClass: "Guerrier",
      playerLevel: 1,
      playerExpToNextLevel: 100,
      playerGold: 15,
    } as AdventureSettings);
  
    const initialSettings: AdventureSettings = {
      world: "Le village paisible de Bourgenval est niché au bord de la Forêt Murmurante. Récemment, des gobelins plus audacieux qu'à l'accoutumée ont commencé à attaquer les voyageurs et à piller les fermes isolées. Les villageois sont terrifiés.",
      initialSituation: "Vous arrivez à Bourgenval, fatigué par la route. L'Impératrice Yumi, la matriarche respectée du village, vous aborde avec un regard inquiet. 'Étranger,' dit-elle, 'votre regard est celui d'un guerrier. Nous avons désespérément besoin d'aide. Les gobelins de la Grotte Grinçante sont devenus une véritable menace. Pourriez-vous nous en débarrasser ?'",
      rpgMode: true,
      relationsMode: true,
      strategyMode: true,
      comicModeActive: false, // Default to false
      playerName: "Héros",
      playerClass: "Guerrier",
      playerLevel: 1,
      playerDetails: "Un aventurier errant au regard déterminé.",
      playerDescription: "Un passé mystérieux, à la recherche de gloire et de fortune.",
      playerOrientation: "Inconnu",
      playerPortraitUrl: null,
      playerFaceSwapEnabled: false,
      ...initialPlayerAttributes,
      ...initialBaseDerivedStats,
      playerCurrentHp: initialBaseDerivedStats.playerMaxHp,
      playerCurrentMp: initialBaseDerivedStats.maxManaPoints,
      playerCurrentExp: 0,
      playerExpToNextLevel: 100,
      playerGold: 15,
      playerInventory: [
          {id: "potion-soin-initial-1", name: "Potion de Soin Mineure", quantity: 2, description: "Une fiole rougeâtre qui restaure quelques points de vie.", effect: "Restaure 10 PV", type: "consumable", goldValue: 10, generatedImageUrl: null, isEquipped: false, statBonuses: {}},
          {id: "dague-rouillee-initial-1", name: "Dague Rouillée", quantity: 1, description: "Une dague simple et usée.", effect: "Arme de base.", type: "weapon", goldValue: 2, damage: "1d4", generatedImageUrl: null, isEquipped: false, statBonuses: {}}
      ],
      equippedItemIds: { weapon: null, armor: null, jewelry: null },
      playerSkills: [],
      familiars: [],
      mapPointsOfInterest: [
          { id: 'poi-bourgenval', name: 'Bourgenval', level: 1, description: 'Un village paisible mais anxieux.', icon: 'Village', position: { x: 50, y: 50 }, ownerId: PLAYER_ID, resources: poiLevelConfig.Village[1].resources, lastCollectedTurn: undefined, buildings: [] },
          { id: 'poi-foret', name: 'Forêt Murmurante', level: 1, description: 'Une forêt dense et ancienne, territoire du Duc Asdrubael.', icon: 'Trees', position: { x: 75, y: 30 }, ownerId: 'duc-asdrubael', resources: poiLevelConfig.Trees[1].resources, lastCollectedTurn: undefined, buildings: [] },
          { id: 'poi-grotte', name: 'Grotte Grinçante', level: 1, description: 'Le repaire des gobelins dirigé par Frak.', icon: 'Shield', position: { x: 80, y: 70 }, ownerId: 'frak-1', resources: poiLevelConfig.Shield[1].resources, lastCollectedTurn: undefined, buildings: [] },
      ],
      mapImageUrl: null,
      timeManagement: {
        enabled: false,
        day: 1,
        dayName: "Lundi",
        dayNames: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
        currentTime: "12:00",
        timeFormat: "24h",
        currentEvent: "",
        timeElapsedPerTurn: "00:15",
      },
      activeItemUniverses: ['Médiéval-Fantastique'],
    };
  
    const initialCharacters: Character[] = [
        {
          id: 'yumi-1',
          name: "Impératrice Yumi",
          details: "Souveraine respectée de Bourgenval et de ses environs. Elle porte le fardeau des espoirs de son peuple. D'apparence sage, elle a environ 70 ans, des cheveux gris tressés, et des yeux perçants et bienveillants.",
          biographyNotes: "Yumi a vu des générations grandir et tomber. Elle est déterminée à protéger son peuple, quitte à faire confiance à des étrangers.",
          history: ["A demandé de l'aide au joueur pour les gobelins."],
          portraitUrl: null,
          faceSwapEnabled: false,
          affinity: 60,
          relations: { [PLAYER_ID]: "Espoir du village", 'elara-1': "Protégée" },
          isAlly: false, 
          initialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT,
          level: 5, currentExp: 0, expToNextLevel: 800,
          characterClass: "Impératrice", isHostile: false,
          strength: 9, dexterity: 10, constitution: 12, intelligence: 16, wisdom: 17, charisma: 15,
          hitPoints: 40, maxHitPoints: 40, manaPoints: 30, maxManaPoints: 30, armorClass: 12, attackBonus: 2, damageBonus: "1d4",
          spells: ["Soin Léger", "Lumière", "Protection contre le Mal"],
          factionColor: '#8A2BE2', // BlueViolet
          locationId: 'poi-bourgenval',
        },
        {
          id: 'elara-1',
          name: "Elara",
          details: "Une jeune aventurière talentueuse et énergique, spécialisée dans la magie de protection. Elle vous a rejoint pour vous aider dans votre quête à la demande de l'Impératrice.",
          biographyNotes: "Elara cherche à prouver sa valeur et à protéger les innocents. Elle est loyale mais peut être un peu impulsive.",
          history: ["S'est jointe à l'équipe du joueur."],
          portraitUrl: null,
          faceSwapEnabled: false,
          affinity: 70,
          relations: { [PLAYER_ID]: "Compagne d'aventure", 'yumi-1': "Mentor" },
          isAlly: true,
          initialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT,
          level: 1, currentExp: 0, expToNextLevel: 100,
          characterClass: "Mage de Bataille", isHostile: false,
          strength: 10, dexterity: 12, constitution: 12, intelligence: 15, wisdom: 13, charisma: 11,
          hitPoints: 12, maxHitPoints: 12,
          manaPoints: 15, maxManaPoints: 15,
          armorClass: 11,
          attackBonus: 2,
          damageBonus: "1d6",
          spells: ["Projectile Magique", "Armure de Mage"],
          factionColor: '#00FFFF', // Cyan
          locationId: 'poi-bourgenval',
        },
        {
          id: 'duc-asdrubael',
          name: "Duc Asdrubael",
          details: "Un noble énigmatique et puissant qui contrôle la Forêt Murmurante. Ses intentions sont obscures.",
          biographyNotes: "Le Duc Asdrubael est un reclus qui communique rarement avec le monde extérieur. Il est très protecteur de ses terres.",
          history: ["Possède la Forêt Murmurante."],
          portraitUrl: null,
          faceSwapEnabled: false,
          affinity: 40,
          relations: { [PLAYER_ID]: "Inconnu" },
          isAlly: false, initialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT,
          level: 5, currentExp: 0, expToNextLevel: 800,
          characterClass: "Noble Reclus", isHostile: false,
          strength: 12, dexterity: 10, constitution: 14, intelligence: 16, wisdom: 15, charisma: 14,
          hitPoints: 45, maxHitPoints: 45, armorClass: 14, attackBonus: 4, damageBonus: "1d6+1",
          
          factionColor: '#0000FF', // Blue
          locationId: 'poi-foret',
        },
        {
          id: 'frak-1',
          name: "Frak, Chef Gobelin",
          details: "Un gobelin particulièrement grand et méchant, avec une cicatrice en travers du museau et armé d'une hache rouillée. Il dirige la tribu de la Grotte Grinçante.",
          biographyNotes: "Frak est devenu plus agressif récemment, poussé par une force mystérieuse ou un besoin désespéré.",
          history: ["Dirige les raids contre Bourgenval."],
          portraitUrl: null,
          faceSwapEnabled: false,
          affinity: 5,
          relations: { [PLAYER_ID]: "Intrus à tuer" },
          isAlly: false, initialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT,
          level: 2, currentExp: 0, expToNextLevel: 150,
          characterClass: "Chef Gobelin", isHostile: true,
          strength: 14, dexterity: 12, constitution: 13, intelligence: 8, wisdom: 9, charisma: 7,
          hitPoints: 25, maxHitPoints: 25, armorClass: 13, attackBonus: 3, damageBonus: "1d8+1",
          
          factionColor: '#FF0000', // Red
          locationId: 'poi-grotte',
        },
        {
          id: 'snirf-1',
          name: "Snirf, Gobelin Fureteur",
          details: "Un petit gobelin agile et sournois, armé d'une courte dague. Sert d'éclaireur pour sa tribu.",
          biographyNotes: "Snirf est plus couard que méchant, mais loyal à Frak par peur.",
          history: ["A été aperçu rôdant près de Bourgenval."],
          portraitUrl: null,
          faceSwapEnabled: false,
          affinity: 10,
          relations: { [PLAYER_ID]: "Cible facile", "frak-1": "Chef redouté" },
          isAlly: false, initialAttributePoints: INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT,
          level: 1, currentExp: 0, expToNextLevel: 100,
          characterClass: "Fureteur Gobelin", isHostile: true,
          strength: 10, dexterity: 14, constitution: 10, intelligence: 7, wisdom: 8, charisma: 6,
          hitPoints: 8, maxHitPoints: 8, armorClass: 12, attackBonus: 2, damageBonus: "1d4",
          
          factionColor: '#DC143C', // Crimson
          locationId: 'poi-grotte',
        }
    ];

    const initialNarrative: Message[] = [
        { id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }
    ];
    
    const initialAiConfig: AiConfig = {
      llm: { source: 'gemini' },
      image: { source: 'gemini' }
    };
  
    return { settings: initialSettings, characters: initialCharacters, narrative: initialNarrative, aiConfig: initialAiConfig };
};


export default function Home() {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const adventureFormRef = React.useRef<AdventureFormHandle>(null);
  const { toast } = useToast();

  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => createInitialState().settings);
  const [characters, setCharacters] = React.useState<Character[]>(() => createInitialState().characters);
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
  const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>(() => createInitialState().narrative);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");
  const [aiConfig, setAiConfig] = React.useState<AiConfig>(() => createInitialState().aiConfig);
  const [merchantInventory, setMerchantInventory] = React.useState<SellingItem[]>([]);
  const [shoppingCart, setShoppingCart] = React.useState<SellingItem[]>([]); // NEW: Shopping cart state
  
  const [allConsumables, setAllConsumables] = React.useState<BaseItem[]>([]);
  const [allWeapons, setAllWeapons] = React.useState<BaseItem[]>([]);
  const [allArmors, setAllArmors] = React.useState<BaseItem[]>([]);
  const [allJewelry, setAllJewelry] = React.useState<BaseItem[]>([]);


  // Comic Draft State
  const [comicDraft, setComicDraft] = React.useState<ComicPage[]>([]);
  const [currentComicPageIndex, setCurrentComicPageIndex] = React.useState(0);
  const [isSaveComicDialogOpen, setIsSaveComicDialogOpen] = React.useState(false);
  const [comicTitle, setComicTitle] = React.useState("");
  const [comicCoverUrl, setComicCoverUrl] = React.useState<string | null>(null);
  const [isGeneratingCover, setIsGeneratingCover] = React.useState(false);

  // Base state for resets
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(createInitialState().characters)));
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(createInitialState().settings)));
  
  // Staged state for form edits
  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureFormValues>(() => {
    const initialState = createInitialState();
    return {
      ...JSON.parse(JSON.stringify(initialState.settings)),
      characters: JSON.parse(JSON.stringify(initialState.characters.map(c => ({ id: c.id, name: c.name, details: c.details, factionColor: c.factionColor, affinity: c.affinity, relations: c.relations, portraitUrl: c.portraitUrl, faceSwapEnabled: c.faceSwapEnabled }))))
    };
  });
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => createInitialState().characters);
  
  const [formPropKey, setFormPropKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);
  const [isGeneratingItemImage, setIsGeneratingItemImage] = React.useState<boolean>(false);
  const [itemToSellDetails, setItemToSellDetails] = React.useState<SellingItemDetails | null>(null);
  const [sellQuantity, setSellQuantity] = React.useState(1);
  const [isLoadingInitialSkill, setIsLoadingInitialSkill] = React.useState<boolean>(false);
  const [useAestheticFont, setUseAestheticFont] = React.useState(true);
  const [isGeneratingMap, setIsGeneratingMap] = React.useState(false);

  // NEW: State for item targeting in combat
  const [itemToUse, setItemToUse] = React.useState<PlayerInventoryItem | null>(null);
  const [isTargeting, setIsTargeting] = React.useState(false);

  const onUploadToComicPanel = React.useCallback((pageIndex: number, panelIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setComicDraft(prev => prev.map((page, pIndex) => {
            if (pIndex !== pageIndex) return page;
            const newPanels = page.panels.map((panel, paIndex) => 
                paIndex === panelIndex ? { ...panel, imageUrl } : panel
            );
            return { ...page, panels: newPanels };
        }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItem[], imageUrl?: string, imageTransform?: ImageTransform) => {
       const newItemsWithIds: PlayerInventoryItem[] | undefined = lootItems?.map(item => ({
           id: item.itemName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
           name: item.itemName,
           quantity: item.quantity,
           description: item.description,
           effect: item.effect,
           type: item.itemType,
           goldValue: item.goldValue,
           statBonuses: item.statBonuses,
           generatedImageUrl: null,
           isEquipped: false,
       }));

       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined,
            imageUrl: type === 'ai' ? imageUrl : undefined,
            imageTransform: type === 'ai' ? imageTransform : undefined,
            loot: type === 'ai' && newItemsWithIds && newItemsWithIds.length > 0 ? newItemsWithIds : undefined,
            lootTaken: false,
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, []);
   
  const handleCombatUpdates = React.useCallback((updates: CombatUpdatesSchema) => {
    if (!updates) return;
  
    // Update main character list with new stats
    if (updates.updatedCombatants) {
        const combatantsMap = new Map(updates.updatedCombatants.map(c => [c.combatantId, c]));
        setCharacters(prev =>
          prev.map(char => {
            const update = combatantsMap.get(char.id);
            if (update) {
              return {
                ...char,
                hitPoints: update.newHp,
                manaPoints: update.newMp ?? char.manaPoints,
                statusEffects: update.newStatusEffects ?? char.statusEffects,
              };
            }
            return char;
          })
        );
    }
  
    // Update player stats
    const playerUpdate = updates.updatedCombatants?.find(c => c.combatantId === PLAYER_ID);
    if (playerUpdate) {
        setAdventureSettings(prev => ({
          ...prev,
          playerCurrentHp: playerUpdate.newHp,
          playerCurrentMp: playerUpdate.newMp ?? prev.playerCurrentMp,
        }));
    }
    
    // Handle end of combat rewards
    if (updates.combatEnded) {
        let lootMessage = "Le combat est terminé ! ";
        let newLootItems: PlayerInventoryItem[] = [];

        if (updates.expGained && updates.expGained > 0) {
            lootMessage += `Vous gagnez ${updates.expGained} points d'expérience. `;
            setAdventureSettings(prev => ({...prev, playerCurrentExp: (prev.playerCurrentExp || 0) + updates.expGained!}));
        }
        if (updates.currencyGained && updates.currencyGained > 0) {
             lootMessage += `Vous trouvez ${updates.currencyGained} pièces d'or.`;
             setAdventureSettings(prev => ({...prev, playerGold: (prev.playerGold || 0) + updates.currencyGained!}));
        }
        if (updates.itemsObtained && updates.itemsObtained.length > 0) {
             newLootItems = updates.itemsObtained.map(item => ({
                id: item.itemName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                name: item.itemName,
                quantity: item.quantity,
                description: item.description,
                effect: item.effect,
                type: item.itemType,
                goldValue: item.goldValue,
                statBonuses: item.statBonuses,
                generatedImageUrl: null,
                isEquipped: false,
            }));
        }

        if (lootMessage.trim() !== "Le combat est terminé!") {
            handleNarrativeUpdate(lootMessage, 'system', undefined, newLootItems);
        }
        
        setActiveCombat(undefined); // Reset combat state
    }
    
    // Update activeCombat state if combat is ongoing
    else if (updates.nextActiveCombatState) {
        setActiveCombat(updates.nextActiveCombatState);
    }

  }, [handleNarrativeUpdate]);

  const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: PlayerInventoryItem[], silent: boolean = false) => {
    React.startTransition(() => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;
            const newInventory = [...(prevSettings.playerInventory || [])];
            
            const lootMessage = narrativeMessages.find(m => m.id === messageId);
            let currencyGained = 0;
             if (lootMessage?.loot) {
                const currencyItem = lootMessage.loot.find(item => item.name.toLowerCase().includes("pièces d'or") || item.name.toLowerCase().includes("gold"));
                if (currencyItem) {
                    currencyGained = currencyItem.quantity;
                }
             }

            itemsToTake.forEach(item => {
                if (!item.id || !item.name || typeof item.quantity !== 'number' || !item.type) {
                    console.warn("Skipping invalid loot item (missing id, name, quantity, or type):", item);
                    return;
                }
                const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.name);
                if (existingItemIndex > -1) {
                    newInventory[existingItemIndex].quantity += item.quantity;
                } else {
                    newInventory.push({ ...item, isEquipped: false });
                }
            });
            return { ...prevSettings, playerInventory: newInventory, playerGold: (prevSettings.playerGold || 0) + currencyGained };
        });
        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
    });
    if (!silent) {
        setTimeout(() => {toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });},0);
    }
  }, [toast, narrativeMessages]);

  const resolveCombatTurn = React.useCallback(
    (
      currentCombatState: ActiveCombat,
      settings: AdventureSettings,
      allCharacters: Character[]
    ): {
        nextCombatState: ActiveCombat;
        turnLog: string[];
        combatUpdates: CombatUpdatesSchema;
        conquestHappened: boolean;
    } => {
        let turnLog: string[] = [];
        let updatedCombatants = JSON.parse(JSON.stringify(currentCombatState.combatants)) as Combatant[];
        const effectivePlayerStats = calculateEffectiveStats(settings);
        let conquestHappened = false;
    
        const getDamage = (damageBonus: string | undefined): number => {
            if (!damageBonus) return 1;
            const match = damageBonus.match(/(\d+)d(\d+)([+-]\d+)?/);
            let damage = 1;
            if (match) {
                const [_, diceCount, diceSides, bonus] = match;
                damage = 0;
                for (let i = 0; i < parseInt(diceCount, 10); i++) {
                    damage += Math.floor(Math.random() * parseInt(diceSides, 10)) + 1;
                }
                if (bonus) damage += parseInt(bonus, 10);
            } else if (!isNaN(parseInt(damageBonus, 10))) {
                damage = parseInt(damageBonus, 10);
            }
            return Math.max(1, damage);
        };
        
        const player = updatedCombatants.find(c => c.characterId === PLAYER_ID);
        if (player && !player.isDefeated) {
             const target = updatedCombatants.find(c => c.team === 'enemy' && !c.isDefeated);
             if(target) {
                 const attackRoll = Math.floor(Math.random() * 20) + 1;
                 const totalAttack = attackRoll + (effectivePlayerStats.playerAttackBonus || 0);
                 const targetData = allCharacters.find(c => c.id === target.characterId);
                 const targetAC = targetData?.armorClass ?? 10;
  
                 if (totalAttack >= targetAC) {
                     const damage = getDamage(effectivePlayerStats.playerDamageBonus);
                     target.currentHp = Math.max(0, target.currentHp - damage);
                     turnLog.push(`${player.name} touche ${target.name} et inflige ${damage} points de dégâts.`);
                     if (target.currentHp === 0) {
                         target.isDefeated = true;
                         turnLog.push(`${target.name} est vaincu!`);
                     }
                 } else {
                     turnLog.push(`${player.name} attaque ${target.name} mais rate son coup.`);
                 }
             }
        }
    
        updatedCombatants.filter(c => c.team === 'enemy' && !c.isDefeated).forEach(enemy => {
            const targetPool = updatedCombatants.filter(t => t.team === 'player' && !t.isDefeated);
            if (targetPool.length > 0) {
                const target = targetPool[Math.floor(Math.random() * targetPool.length)];
                const enemyData = allCharacters.find(c => c.id === enemy.characterId);
                const attackRoll = Math.floor(Math.random() * 20) + 1;
                const totalAttack = attackRoll + (enemyData?.attackBonus || 0);
                
                let targetAC = 10;
                if (target.characterId === PLAYER_ID) {
                    targetAC = effectivePlayerStats.playerArmorClass || 10;
                } else {
                    const allyData = allCharacters.find(c => c.id === target.characterId);
                    targetAC = allyData?.armorClass ?? 10;
                }
    
                if (totalAttack >= totalAttack) {
                    const damage = getDamage(enemyData?.damageBonus);
                    target.currentHp = Math.max(0, target.currentHp - damage);
                    turnLog.push(`${enemy.name} attaque ${target.name} et inflige ${damage} points de dégâts.`);
                    if (target.currentHp === 0) {
                        target.isDefeated = true;
                        turnLog.push(`${target.name} est vaincu!`);
                    }
                } else {
                    turnLog.push(`${enemy.name} attaque ${target.name} et rate.`);
                 }
            }
        });
        
        const allEnemiesDefeated = updatedCombatants.filter(c => c.team === 'enemy').every(c => c.isDefeated);
        const allPlayersDefeated = updatedCombatants.filter(c => c.team === 'player').every(c => c.isDefeated);
        
        const isCombatOver = allEnemiesDefeated || allPlayersDefeated;
        let expGained = 0;
        let currencyGained = 0;
        let itemsObtained: LootedItem[] = [];
        let lootItemsText = "";
  
        if (isCombatOver && allEnemiesDefeated) {
            updatedCombatants.filter(c => c.team === 'enemy' && c.isDefeated).forEach(enemy => {
                const enemyData = baseCharacters.find(bc => bc.id === enemy.characterId);
                if (enemyData) {
                    expGained += (enemyData.level || 1) * 10;
                    currencyGained += Math.floor(Math.random() * (enemyData.level || 1) * 5) + (enemyData.level || 1);
                }
            });
            turnLog.push(`Victoire!`);
            
            if(currentCombatState.contestedPoiId) {
                conquestHappened = true; // Signal that a conquest happened
                const poiName = settings.mapPointsOfInterest?.find(p=>p.id === currentCombatState.contestedPoiId)?.name || "Territoire Inconnu";
                turnLog.push(`Le territoire de ${poiName} est conquis!`);
            }
        }
  
        const combatUpdates: CombatUpdatesSchema = {
            updatedCombatants: updatedCombatants.map(c => ({
                combatantId: c.characterId,
                newHp: c.currentHp,
                newMp: c.currentMp,
                isDefeated: c.isDefeated,
                newStatusEffects: c.statusEffects,
            })),
            combatEnded: isCombatOver,
            expGained: expGained,
            currencyGained: currencyGained,
            itemsObtained: itemsObtained,
            lootItemsText: lootItemsText,
            turnNarration: turnLog.join('\n'), // For AI context
            nextActiveCombatState: {
                ...currentCombatState,
                combatants: updatedCombatants,
                isActive: !isCombatOver,
            }
        };
  
        return {
            nextCombatState: combatUpdates.nextActiveCombatState!,
            turnLog,
            combatUpdates,
            conquestHappened,
        };
    }, [baseCharacters]);

  const handleToggleAestheticFont = React.useCallback(() => {
    const newFontState = !useAestheticFont;
    setUseAestheticFont(newFontState);
    toast({
        title: "Police de la carte changée",
        description: `La police ${newFontState ? "esthétique a été activée" : "standard a été activée"}.`
    });
  }, [useAestheticFont, toast]);

  const loadAdventureState = React.useCallback((stateToLoad: SaveData) => {
    if (!stateToLoad.adventureSettings || !stateToLoad.characters || !stateToLoad.narrative) {
        toast({ title: "Erreur de Chargement", description: "Le fichier de sauvegarde est invalide ou corrompu.", variant: "destructive" });
        return;
    }
    React.startTransition(() => {
        const effectiveStats = calculateEffectiveStats(stateToLoad.adventureSettings);
        const finalSettings = { ...stateToLoad.adventureSettings, ...effectiveStats };

        setAdventureSettings(finalSettings);
        setCharacters(stateToLoad.characters);
        setNarrativeMessages(stateToLoad.narrative);
        setActiveCombat(stateToLoad.activeCombat);
        setCurrentLanguage(stateToLoad.currentLanguage || "fr");
        setAiConfig(stateToLoad.aiConfig || createInitialState().aiConfig);

        setBaseAdventureSettings(JSON.parse(JSON.stringify(finalSettings)));
        setBaseCharacters(JSON.parse(JSON.stringify(stateToLoad.characters)));
        
        toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });

        const poisToPlace = finalSettings.mapPointsOfInterest?.filter(p => !p.position) || [];
        if (poisToPlace.length > 0) {
            setTimeout(() => {
                let currentSettings = finalSettings;
                poisToPlace.forEach(poi => {
                    const pois = currentSettings.mapPointsOfInterest || [];
                    const poiExists = pois.some(p => p.id === poi.id && p.position);
                    if (!poiExists) {
                        const newPois = pois.map(p => 
                            p.id === poi.id ? { ...p, position: { x: 50, y: 50 } } : p
                        );
                        currentSettings = { ...currentSettings, mapPointsOfInterest: newPois };
                    }
                });
                setAdventureSettings(currentSettings);
                toast({ title: "Carte Mise à Jour", description: `${poisToPlace.length} lieu(x) ont été placé(s) sur la carte.` });
            }, 500);
        }
    });
  }, [toast]);

  React.useEffect(() => {
      setStagedAdventureSettings({
          ...JSON.parse(JSON.stringify(baseAdventureSettings)),
          characters: JSON.parse(JSON.stringify(baseCharacters)).map((c: Character) => ({ id: c.id, name: c.name, details: c.details, factionColor: c.factionColor, affinity: c.affinity, relations: c.relations, portraitUrl: c.portraitUrl, faceSwapEnabled: c.faceSwapEnabled }))
      });
      setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)));
      setFormPropKey(k => k + 1);
  }, [baseAdventureSettings, baseCharacters]);


  React.useEffect(() => {
      const shouldLoad = localStorage.getItem('loadStoryOnMount');
      if (shouldLoad === 'true') {
          const stateString = localStorage.getItem('currentAdventureState');
          if (stateString) {
              try {
                  const loadedState: SaveData = JSON.parse(stateString);
                  loadAdventureState(loadedState);
              } catch (e) {
                  console.error("Failed to parse adventure state from localStorage", e);
                  toast({ title: "Erreur", description: "Impossible de charger l'histoire sauvegardée.", variant: "destructive" });
              }
          }
          localStorage.removeItem('loadStoryOnMount');
          localStorage.removeItem('currentAdventureState');
      }

      const loadAllItemTypes = () => {
          const loadType = (key: string, defaultItems: BaseItem[]) => {
              try {
                  const storedItems = localStorage.getItem(key);
                  if (storedItems) {
                      const customItems: BaseItem[] = JSON.parse(storedItems);
                      const baseMap = new Map(defaultItems.map(item => [item.id, item]));
                      const customMap = new Map(customItems.map(item => [item.id, item]));
                      return Array.from(new Map([...baseMap, ...customMap]).values());
                  }
              } catch (error) {
                  console.error(`Failed to load custom items for ${key}:`, error);
              }
              return defaultItems;
          }
          setAllConsumables(loadType('custom_consumables', BASE_CONSUMABLES));
          setAllWeapons(loadType('custom_weapons', BASE_WEAPONS));
          setAllArmors(loadType('custom_armors', BASE_ARMORS));
          setAllJewelry(loadType('custom_jewelry', BASE_JEWELRY));
      };

      loadAllItemTypes();
      // Listen for storage changes from other components/tabs
      window.addEventListener('storage', loadAllItemTypes);
      return () => {
          window.removeEventListener('storage', loadAllItemTypes);
      };
  }, [loadAdventureState, toast]);

  React.useEffect(() => {
    const fetchInitialSkill = async () => {
      if (
        adventureSettings.rpgMode &&
        adventureSettings.playerLevel === 1 &&
        (!adventureSettings.playerSkills || adventureSettings.playerSkills.length === 0) &&
        adventureSettings.playerClass
      ) {
        setIsLoadingInitialSkill(true);
        try {
          const skillInput: SuggestPlayerSkillInput = {
            playerClass: adventureSettings.playerClass,
            playerLevel: 1,
            currentLanguage: currentLanguage,
          };
          const suggestedSkill: SuggestPlayerSkillFlowOutput = await suggestPlayerSkill(skillInput);

          if (suggestedSkill.error) {
            console.error("Failed to fetch initial skill:", suggestedSkill.error);
            setTimeout(() => {
              toast({
                title: "Erreur de Compétence",
                description: suggestedSkill.error,
                variant: "destructive",
              });
            }, 0);
            return;
          }

          const newSkill: PlayerSkill = {
            id: `skill-${suggestedSkill.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: suggestedSkill.name,
            description: suggestedSkill.description,
            category: 'class', 
          };

          setAdventureSettings(prev => ({
            ...prev,
            playerSkills: [newSkill],
          }));
          setStagedAdventureSettings(prev => ({ 
            ...prev,
            playerSkills: [newSkill],
          }));
          setTimeout(() => {
            toast({
              title: "Compétence Initiale Acquise!",
              description: `${newSkill.name}: ${newSkill.description}`,
            });
          }, 0);
        } catch (error) {
          console.error("Unexpected error fetching initial skill:", error);
           setTimeout(() => {
            toast({
              title: "Erreur Inattendue",
              description: error instanceof Error ? error.message : "Une erreur inattendue est survenue lors de la suggestion de compétence.",
              variant: "destructive",
            });
          }, 0);
        } finally {
          setIsLoadingInitialSkill(false);
        }
      }
    };

    fetchInitialSkill();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adventureSettings.rpgMode, adventureSettings.playerLevel, adventureSettings.playerClass, currentLanguage]);


  const addCurrencyToPlayer = React.useCallback((amount: number) => {
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode) return prevSettings;
        let currentGold = prevSettings.playerGold ?? 0;
        let newGold = currentGold + amount;
        if (newGold < 0) newGold = 0;
        return { ...prevSettings, playerGold: newGold };
    });
  }, []);

  const handlePoiOwnershipChange = React.useCallback((changes: { poiId: string; newOwnerId: string }[]) => {
    if (!changes || changes.length === 0) return;

    const updater = (prev: AdventureSettings): AdventureSettings => {
        if (!prev.mapPointsOfInterest) return prev;

        let pois = [...prev.mapPointsOfInterest];
        let changed = false;

        changes.forEach(change => {
            const poiIndex = pois.findIndex(p => p.id === change.poiId);
            if (poiIndex !== -1) {
                const oldOwnerId = pois[poiIndex].ownerId;
                if (oldOwnerId !== change.newOwnerId) {
                    const poi = pois[poiIndex];
                    const newOwnerName = change.newOwnerId === PLAYER_ID ? (adventureSettings.playerName || "Joueur") : characters.find(c => c.id === change.newOwnerId)?.name || 'un inconnu';
                    
                    pois[poiIndex] = { ...poi, ownerId: change.newOwnerId };
                    changed = true;
                    
                    setTimeout(() => {
                        toast({
                            title: "Changement de Territoire!",
                            description: `${poi.name} est maintenant sous le contrôle de ${newOwnerName}.`
                        });
                    }, 0);
                }
            }
        });

        if (!changed) return prev;
        return { ...prev, mapPointsOfInterest: pois };
    };
    
    setAdventureSettings(updater);
    setStagedAdventureSettings(prevStaged => {
        const updatedLiveState = { ...prevStaged, mapPointsOfInterest: prevStaged.mapPointsOfInterest || [] } as AdventureSettings;
        const finalPois = updater(updatedLiveState).mapPointsOfInterest;
        return { ...prevStaged, mapPointsOfInterest: finalPois };
    });
    setFormPropKey(k => k + 1);

}, [toast, characters, adventureSettings.playerName]);

const handleNewCharacters = React.useCallback((newChars: NewCharacterSchema[]) => {
    if (!newChars || newChars.length === 0) return;

    setAdventureSettings(currentSettings => {
        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";

        const newCharactersToAdd: Character[] = newChars.map(nc => {
            const newId = `${nc.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

            let initialRelations: Record<string, string> = {};
            if (currentSettings.relationsMode) {
                initialRelations[PLAYER_ID] = defaultRelationDesc;
                if (nc.initialRelations) {
                    nc.initialRelations.forEach(rel => {
                        const targetChar = characters.find(c => c.name.toLowerCase() === rel.targetName.toLowerCase());
                        if (targetChar) {
                            initialRelations[targetChar.id] = rel.description;
                        } else if (rel.targetName.toLowerCase() === (currentSettings.playerName || "player").toLowerCase()) {
                            initialRelations[PLAYER_ID] = rel.description;
                        }
                    });
                }
            }
            
            const npcLevel = nc.level ?? 1;
            const npcBaseDerivedStats = calculateBaseDerivedStats({
                level: npcLevel,
                characterClass: nc.characterClass || "PNJ",
                strength: BASE_ATTRIBUTE_VALUE, dexterity: BASE_ATTRIBUTE_VALUE, constitution: BASE_ATTRIBUTE_VALUE,
                intelligence: BASE_ATTRIBUTE_VALUE, wisdom: BASE_ATTRIBUTE_VALUE, charisma: BASE_ATTRIBUTE_VALUE,
            });

            return {
                id: newId,
                name: nc.name,
                details: nc.details || (currentLanguage === 'fr' ? "Aucun détail fourni." : "No details provided."),
                biographyNotes: nc.biographyNotes || (currentLanguage === 'fr' ? 'Aucune note biographique.' : 'No biographical notes.'),
                history: nc.initialHistoryEntry ? [nc.initialHistoryEntry] : [],
                portraitUrl: null,
                faceSwapEnabled: false,
                affinity: currentSettings.relationsMode ? 50 : undefined,
                relations: currentSettings.relationsMode ? initialRelations : undefined,
                isAlly: nc.isAlly ?? false,
                initialAttributePoints: currentSettings.rpgMode ? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT : undefined,
                currentExp: currentSettings.rpgMode ? 0 : undefined,
                expToNextLevel: currentSettings.rpgMode ? Math.floor(100 * Math.pow(1.5, npcLevel - 1)) : undefined,
                locationId: currentSettings.playerLocationId,
                ...(currentSettings.rpgMode ? {
                    level: npcLevel,
                    characterClass: nc.characterClass || "PNJ",
                    strength: BASE_ATTRIBUTE_VALUE, dexterity: BASE_ATTRIBUTE_VALUE, constitution: BASE_ATTRIBUTE_VALUE,
                    intelligence: BASE_ATTRIBUTE_VALUE, wisdom: BASE_ATTRIBUTE_VALUE, charisma: BASE_ATTRIBUTE_VALUE,
                    hitPoints: nc.hitPoints ?? npcBaseDerivedStats.maxHitPoints,
                    maxHitPoints: nc.maxHitPoints ?? npcBaseDerivedStats.maxHitPoints,
                    manaPoints: nc.manaPoints ?? npcBaseDerivedStats.maxManaPoints,
                    maxManaPoints: nc.maxManaPoints ?? npcBaseDerivedStats.maxManaPoints,
                    armorClass: nc.armorClass ?? npcBaseDerivedStats.armorClass,
                    attackBonus: nc.attackBonus ?? npcBaseDerivedStats.attackBonus,
                    damageBonus: nc.damageBonus ?? npcBaseDerivedStats.damageBonus,
                    isHostile: nc.isHostile ?? false,
                } : {})
            };
        });

        setCharacters(currentChars => {
            const updatedChars = [...currentChars];
            newCharactersToAdd.forEach(newChar => {
                if (!updatedChars.some(c => c.id === newChar.id || c.name.toLowerCase() === newChar.name.toLowerCase())) {
                    updatedChars.push(newChar);
                    if (currentSettings.relationsMode) {
                        for (let i = 0; i < updatedChars.length - 1; i++) {
                            if (!updatedChars[i].relations) updatedChars[i].relations = {};
                            if (!updatedChars[i].relations![newChar.id]) {
                                updatedChars[i].relations![newChar.id] = defaultRelationDesc;
                            }
                            if (!newChar.relations) newChar.relations = {};
                            if (!newChar.relations![updatedChars[i].id]) {
                                newChar.relations![updatedChars[i].id] = defaultRelationDesc;
                            }
                        }
                    }
                    setTimeout(() => {
                        toast({
                            title: "Nouveau Personnage Rencontré!",
                            description: `${newChar.name} a été ajouté à votre aventure. Vous pouvez voir ses détails dans le panneau de configuration.`
                        });
                    }, 0);
                }
            });
            setStagedCharacters(updatedChars);
            return updatedChars;
        });
        
        return currentSettings;
    });
}, [currentLanguage, toast, characters]);

const handleNewFamiliar = React.useCallback((newFamiliarSchema: NewFamiliarSchema) => {
    setAdventureSettings(prevSettings => {
        if (!newFamiliarSchema) return prevSettings;

        const newFamiliar: Familiar = {
            id: `${newFamiliarSchema.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: newFamiliarSchema.name,
            description: newFamiliarSchema.description,
            rarity: newFamiliarSchema.rarity,
            level: 1,
            currentExp: 0,
            expToNextLevel: 100,
            isActive: false,
            passiveBonus: newFamiliarSchema.passiveBonus,
            portraitUrl: null,
        };

        const updatedFamiliars = [...(prevSettings.familiars || []), newFamiliar];
        
        setTimeout(() => {
            toast({
                title: "Nouveau Familier!",
                description: `${newFamiliar.name} a rejoint votre groupe! Allez le voir dans l'onglet Familiers pour l'activer.`,
            });
        }, 0);

        return { ...prevSettings, familiars: updatedFamiliars };
    });
}, [toast]);


  const handleCharacterHistoryUpdate = React.useCallback((updates: CharacterUpdateSchema[]) => {
    if (!updates || updates.length === 0) return;
    setStagedCharacters(prevChars => {
        let changed = false;
        const updatedChars = prevChars.map(char => {
            const charUpdates = updates.filter(u => u.characterName.toLowerCase() === char.name.toLowerCase());
            if (charUpdates.length > 0) {
                changed = true;
                const newHistory = charUpdates.map(u => u.historyEntry);
                return {
                    ...char,
                    history: [...(char.history || []), ...newHistory].slice(-20),
                };
            }
            return char;
        });
        if (changed) return updatedChars;
        return prevChars;
    });
  }, []);

  const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    if (!currentRelationsMode || !updates || updates.length === 0) return;

    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

    setStagedCharacters(prevChars => {
         let changed = false;
        const updatedChars = prevChars.map(char => {
            const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
            if (affinityUpdate) {
                changed = true;
                const currentAffinity = char.affinity ?? 50;
                // Clamp the change value to be within [-10, 10] as a safety measure
                const clampedChange = Math.max(-10, Math.min(10, affinityUpdate.change));
                const newAffinity = Math.max(0, Math.min(100, currentAffinity + clampedChange));

                if (Math.abs(clampedChange) >= 3) {
                     const charName = affinityUpdate.characterName;
                     const direction = clampedChange > 0 ? 'améliorée' : 'détériorée';
                     toastsToShow.push({
                         title: `Affinité Modifiée: ${charName}`,
                         description: `Votre relation avec ${charName} s'est significativement ${direction}. Raison: ${affinityUpdate.reason || 'Interaction récente'}`,
                     });
                }
                return { ...char, affinity: newAffinity };
            }
            return char;
        });
        if (changed) return updatedChars;
        return prevChars;
    });
     toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [toast, stagedAdventureSettings.relationsMode]);

  const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
    const currentRelationsMode = stagedAdventureSettings.relationsMode ?? true;
    const currentPlayerName = stagedAdventureSettings.playerName || "Player";
    if (!currentRelationsMode || !updates || !updates.length) return;

    const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

    setStagedCharacters(prevChars => {
        let charsCopy = JSON.parse(JSON.stringify(prevChars)) as Character[];
        let changed = false;

        updates.forEach(update => {
            const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
            if (sourceCharIndex === -1) return;

            let targetId: string | null = null;
            if (update.targetName.toLowerCase() === currentPlayerName.toLowerCase()) {
                targetId = PLAYER_ID;
            } else {
                const targetChar = charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                if (targetChar) targetId = targetChar.id;
                else return;
            }

            if (!targetId) return;

            const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
            const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;


            if (currentRelation !== newRelationFromAI) {
                if (!charsCopy[sourceCharIndex].relations) {
                    charsCopy[sourceCharIndex].relations = {};
                }
                charsCopy[sourceCharIndex].relations![targetId] = newRelationFromAI;
                changed = true;
                toastsToShow.push({
                    title: `Relation Changée: ${update.characterName}`,
                    description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                });

                if (targetId !== PLAYER_ID) {
                    const targetCharIndex = charsCopy.findIndex(c => c.id === targetId);
                    if (targetCharIndex !== -1) {
                        if (!charsCopy[targetCharIndex].relations) {
                           charsCopy[targetCharIndex].relations = {};
                        }
                         charsCopy[targetCharIndex].relations![charsCopy[sourceCharIndex].id] = newRelationFromAI;
                    }
                }
            }
        });

        if (changed) return charsCopy;
        return prevChars;
    });
     toastsToShow.forEach(toastArgs => setTimeout(() => { toast(toastArgs); }, 0));
  }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);



  const handleTimeUpdate = React.useCallback((newEvent?: string) => {
    setAdventureSettings(prev => {
        if (!prev.timeManagement?.enabled) return prev;

        const { currentTime, timeElapsedPerTurn, day, dayNames = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] } = prev.timeManagement;

        const [h1, m1] = currentTime.split(':').map(Number);
        const [h2, m2] = timeElapsedPerTurn.split(':').map(Number);
        
        let totalMinutes = m1 + m2;
        let totalHours = h1 + h2 + Math.floor(totalMinutes / 60);
        
        let newDay = day;
        if (totalHours >= 24) {
            newDay += Math.floor(totalHours / 24);
            totalHours %= 24;
        }

        const newCurrentTime = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
        const newDayName = dayNames[(newDay - 1) % dayNames.length];
        
        return {
            ...prev,
            timeManagement: {
                ...prev.timeManagement,
                day: newDay,
                dayName: newDayName,
                currentTime: newCurrentTime,
                currentEvent: newEvent || prev.timeManagement.currentEvent,
            },
        };
    });
  }, []);

  const callGenerateAdventure = React.useCallback(async (userActionText: string, locationIdOverride?: string) => {
    React.startTransition(() => {
      setIsLoading(true);
    });

    let liveSettings = { ...adventureSettings };
    let liveCharacters = [...characters];
    let liveCombat = activeCombat ? { ...activeCombat } : undefined;
    let turnLog: string[] = [];
    let internalCombatUpdates: CombatUpdatesSchema | undefined;
    let conquestHappened = false;

    if (locationIdOverride) {
        liveSettings.playerLocationId = locationIdOverride;
        liveCharacters = liveCharacters.map(char => 
            char.isAlly ? { ...char, locationId: locationIdOverride } : char
        );
    }
    
    if (liveCombat?.isActive) {
        const combatResult = resolveCombatTurn(liveCombat, liveSettings, liveCharacters);
        internalCombatUpdates = combatResult.combatUpdates;
        liveCombat = combatResult.nextCombatState;
        turnLog = combatResult.turnLog;
        conquestHappened = combatResult.conquestHappened;
        handleCombatUpdates(internalCombatUpdates);
    }

    // This is now purely internal logic and does not depend on the AI's response.
    if (conquestHappened && liveCombat?.contestedPoiId) {
        handlePoiOwnershipChange([{
            poiId: liveCombat.contestedPoiId,
            newOwnerId: PLAYER_ID
        }]);
    }
    
    const presentCharacters = liveCharacters.filter(char => char.locationId === liveSettings.playerLocationId);
    const currentPlayerLocation = liveSettings.playerLocationId ? liveSettings.mapPointsOfInterest?.find(poi => poi.id === liveSettings.playerLocationId) : undefined;
    
    let ownerNameForPrompt = "Inconnu";
    if (currentPlayerLocation?.ownerId) {
        ownerNameForPrompt = currentPlayerLocation.ownerId === PLAYER_ID ? (liveSettings.playerName || "Player") : (liveCharacters.find(c => c.id === currentPlayerLocation.ownerId)?.name || 'un inconnu');
    }

    const effectiveStatsThisTurn = calculateEffectiveStats(liveSettings);

    const input: GenerateAdventureInput = {
        world: liveSettings.world,
        initialSituation: [...narrativeMessages, {id: 'temp-user', type: 'user', content: userActionText, timestamp: Date.now()}].slice(-5).map(msg => msg.type === 'user' ? `${liveSettings.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n'),
        characters: presentCharacters, 
        userAction: turnLog.length > 0 ? turnLog.join('\n') : userActionText,
        currentLanguage,
        playerName: liveSettings.playerName || "Player",
        rpgModeActive: liveSettings.rpgMode,
        relationsModeActive: liveSettings.relationsMode ?? true,
        activeCombat: liveCombat,
        playerGold: liveSettings.playerGold,
        playerSkills: liveSettings.playerSkills,
        playerClass: liveSettings.playerClass,
        playerLevel: liveSettings.playerLevel,
        playerCurrentHp: liveSettings.playerCurrentHp,
        playerMaxHp: effectiveStatsThisTurn.playerMaxHp,
        playerCurrentMp: liveSettings.playerCurrentMp,
        playerMaxMp: effectiveStatsThisTurn.playerMaxMp,
        playerCurrentExp: liveSettings.playerCurrentExp,
        playerExpToNextLevel: effectiveStatsThisTurn.playerExpToNextLevel,
        playerStrength: effectiveStatsThisTurn.playerStrength,
        playerDexterity: effectiveStatsThisTurn.playerDexterity,
        playerConstitution: effectiveStatsThisTurn.playerConstitution,
        playerIntelligence: effectiveStatsThisTurn.playerIntelligence,
        playerWisdom: effectiveStatsThisTurn.playerWisdom,
        playerCharisma: effectiveStatsThisTurn.playerCharisma,
        playerArmorClass: effectiveStatsThisTurn.playerArmorClass,
        playerAttackBonus: effectiveStatsThisTurn.playerAttackBonus,
        playerDamageBonus: effectiveStatsThisTurn.playerDamageBonus,
        equippedWeaponName: liveSettings.equippedItemIds?.weapon ? liveSettings.playerInventory?.find(i => i.id === liveSettings.equippedItemIds?.weapon)?.name : undefined,
        equippedArmorName: liveSettings.equippedItemIds?.armor ? liveSettings.playerInventory?.find(i => i.id === liveSettings.equippedItemIds?.armor)?.name : undefined,
        equippedJewelryName: liveSettings.equippedItemIds?.jewelry ? liveSettings.playerInventory?.find(i => i.id === liveSettings.equippedItemIds?.jewelry)?.name : undefined,
        playerLocationId: liveSettings.playerLocationId,
        mapPointsOfInterest: liveSettings.mapPointsOfInterest,
        playerLocation: currentPlayerLocation ? { ...currentPlayerLocation, ownerName: ownerNameForPrompt } : undefined,
        aiConfig,
        timeManagement: liveSettings.timeManagement,
        playerPortraitUrl: liveSettings.playerPortraitUrl,
        playerFaceSwapEnabled: liveSettings.playerFaceSwapEnabled,
        merchantInventory,
    };

    try {
        const result: GenerateAdventureFlowOutput = await generateAdventure(input);
        
        if (result.error && !result.narrative) {
            toast({ title: "Erreur de l'IA", description: result.error, variant: "destructive" });
        } else {
             // Use turn log as fallback narrative if AI fails to generate one
            const narrativeContent = result.narrative || turnLog.join('\n') || "L'action se déroule, mais l'IA n'a pas fourni de description.";
            
            React.startTransition(() => {
                if (locationIdOverride) {
                    setAdventureSettings(prev => ({...prev, playerLocationId: locationIdOverride}));
                    setCharacters(liveCharacters);
                    setStagedCharacters(liveCharacters);
                }
                
                const lootItemsFromText = (result.lootItemsText || "")
                    .split(',')
                    .map(name => name.trim())
                    .filter(name => name)
                    .map(name => ({
                        itemName: name,
                        quantity: 1,
                        description: `Un objet obtenu: ${name}`,
                        itemType: 'misc',
                        goldValue: 1,
                    } as LootedItem));

                const finalLoot = [...(result.itemsObtained || []), ...lootItemsFromText];
                
                handleNarrativeUpdate(narrativeContent, 'ai', result.sceneDescriptionForImage, finalLoot);

                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.newFamiliars) result.newFamiliars.forEach(handleNewFamiliar);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                
                if (liveSettings.relationsMode && result.affinityUpdates) {
                    // Clamp affinity updates to safe values before applying
                    const clampedAffinityUpdates = result.affinityUpdates.map(u => ({
                        ...u,
                        change: Math.max(-10, Math.min(10, u.change)),
                    }));
                    handleAffinityUpdates(clampedAffinityUpdates);
                }
                
                if (liveSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if (liveSettings.timeManagement?.enabled && result.updatedTime) handleTimeUpdate(result.updatedTime.newEvent);
                
                if (liveSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0) {
                    addCurrencyToPlayer(result.currencyGained);
                     setTimeout(() => {
                        toast({
                            title: result.currencyGained! > 0 ? "Pièces d'Or Reçues!" : "Dépense Effectuée",
                            description: `Votre trésorerie a été mise à jour.`
                        });
                    }, 0);
                }
            });
        }
    } catch (error) { 
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[LOG_PAGE_TSX][callGenerateAdventure] Critical Error:", error);
        toast({ title: "Erreur Critique de l'IA", description: `Une erreur inattendue s'est produite: ${errorMessage}`, variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [
      currentLanguage, narrativeMessages, toast, resolveCombatTurn,
      handleNarrativeUpdate, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates,
      handleRelationUpdatesFromAI, addCurrencyToPlayer, handlePoiOwnershipChange,
      adventureSettings, characters, activeCombat, handleNewFamiliar, aiConfig, handleTimeUpdate, baseCharacters, handleCombatUpdates, merchantInventory
  ]);
  
  const handleSendSpecificAction = React.useCallback(async (action: string) => {
    if (!action || isLoading) return;

    handleNarrativeUpdate(action, 'user');
    setIsLoading(true); // Moved to be more immediate

    try {
        await callGenerateAdventure(action);
    } catch (error) { 
        console.error("Error in handleSendSpecificAction trying to generate adventure:", error);
        toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure.", variant: "destructive" });
        setIsLoading(false); // Ensure loading state is reset on error
    }
  }, [isLoading, handleNarrativeUpdate, callGenerateAdventure, toast]);

  const handleUseFamiliarItem = React.useCallback((item: PlayerInventoryItem) => {
    const isFamiliarItem = item.description?.toLowerCase().includes('familier');

    if (item.type !== 'misc' || !isFamiliarItem) {
        setTimeout(() => {
           toast({
               title: "Utilisation Narrative",
               description: `Vous tentez d'utiliser ${item.name}, mais son effet n'est pas clair. L'IA décrira le résultat.`,
               variant: "default",
           });
        }, 0);
        const narrativeAction = `J'utilise l'objet: ${item.name}.`;
        handleNarrativeUpdate(narrativeAction, 'user');
        callGenerateAdventure(narrativeAction);
        return;
    }

    const familiarName = item.name.replace(/\(Familier\)/i, '').trim();
    const effectMatch = item.effect?.match(/Bonus passif\s*:\s*\+?(\d+)\s*en\s*([a-zA-Z_]+)/i);
    const rarityMatch = item.description?.match(/Rareté\s*:\s*([a-zA-Z]+)/i);

    const bonus: FamiliarPassiveBonus = {
        type: effectMatch ? (effectMatch[2].toLowerCase() as FamiliarPassiveBonus['type']) : 'strength',
        value: effectMatch ? parseInt(effectMatch[1], 10) : 1,
        description: item.effect || "Bonus Passif",
    };

    const newFamiliar: NewFamiliarSchema = {
        name: familiarName,
        description: item.description || `Un familier nommé ${familiarName}.`,
        rarity: rarityMatch ? (rarityMatch[1].toLowerCase() as Familiar['rarity']) : 'common',
        passiveBonus: bonus,
    };

    handleNewFamiliar(newFamiliar);
    
    const narrativeAction = `J'utilise l'objet pour invoquer mon nouveau compagnon: ${item.name}.`;
    handleNarrativeUpdate(narrativeAction, 'user');
    callGenerateAdventure(narrativeAction);

}, [handleNewFamiliar, handleNarrativeUpdate, callGenerateAdventure, toast]);

  const applyCombatItemEffect = React.useCallback((targetId?: string) => {
        if (!itemToUse || !activeCombat?.isActive) return;

        const { effectDetails } = itemToUse;
        let narrativeAction = `J'utilise ${itemToUse.name}`;
        let effectAppliedMessage = "";

        setAdventureSettings(prevSettings => {
            const newInventory = [...(prevSettings.playerInventory || [])];
            const itemIndex = newInventory.findIndex(invItem => invItem.id === itemToUse.id);
            if (itemIndex > -1) {
                newInventory[itemIndex].quantity -= 1;
                if (newInventory[itemIndex].quantity <= 0) {
                    newInventory.splice(itemIndex, 1);
                }
            }
            return { ...prevSettings, playerInventory: newInventory };
        });

        if (effectDetails?.type === 'heal') {
            const hpChange = effectDetails.amount;
            setAdventureSettings(prev => ({
                ...prev,
                playerCurrentHp: Math.min(prev.playerMaxHp || 0, (prev.playerCurrentHp || 0) + hpChange)
            }));
            narrativeAction += `, restaurant ${hpChange} PV.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name} et restauré ${hpChange} PV.`;
        } else if (effectDetails?.type === 'damage_single' && targetId) {
            const target = activeCombat.combatants.find(c => c.characterId === targetId);
            narrativeAction += ` sur ${target?.name}, lui infligeant ${effectDetails.amount} points de dégâts.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name} sur ${target?.name} pour ${effectDetails.amount} dégâts.`;
            setActiveCombat(prev => {
                if (!prev) return prev;
                const newCombatants = prev.combatants.map(c =>
                    c.characterId === targetId ? { ...c, currentHp: Math.max(0, c.currentHp - effectDetails.amount) } : c
                );
                return { ...prev, combatants: newCombatants };
            });
        } else if (effectDetails?.type === 'damage_all') {
            narrativeAction += `, infligeant ${effectDetails.amount} points de dégâts à tous les ennemis.`;
            effectAppliedMessage = `Vous avez utilisé ${itemToUse.name}, infligeant ${effectDetails.amount} dégâts à tous les ennemis.`;
            setActiveCombat(prev => {
                if (!prev) return prev;
                const newCombatants = prev.combatants.map(c =>
                    c.team === 'enemy' ? { ...c, currentHp: Math.max(0, c.currentHp - effectDetails.amount) } : c
                );
                return { ...prev, combatants: newCombatants };
            });
        }
        
        toast({ title: "Action en Combat", description: effectAppliedMessage });
        handleNarrativeUpdate(narrativeAction, 'user');
        callGenerateAdventure(narrativeAction);

        // Reset targeting state
        setIsTargeting(false);
        setItemToUse(null);

    }, [itemToUse, activeCombat, toast, handleNarrativeUpdate, callGenerateAdventure]);

  const handlePlayerItemAction = React.useCallback((itemId: string, action: 'use' | 'discard') => {
    React.startTransition(() => {
        let itemActionSuccessful = false;
        let narrativeAction = "";
        let effectAppliedMessage = "";
        let itemUsedOrDiscarded: PlayerInventoryItem | undefined;

        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) {
                 setTimeout(() => {toast({ title: action === 'use' ? "Utilisation Impossible" : "Action Impossible", description: "Le mode RPG doit être actif et vous devez avoir des objets.", variant: "default" });},0);
                itemActionSuccessful = false;
                return prevSettings;
            }

            const newInventory = [...prevSettings.playerInventory];
            const itemIndex = newInventory.findIndex(invItem => invItem.id === itemId && invItem.quantity > 0);

            if (itemIndex === -1) {
                 const item = prevSettings.playerInventory.find(i => i.id === itemId);
                 setTimeout(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${item?.name || itemId}" ${action === 'use' ? 'utilisable' : ''} ou en quantité suffisante.`, variant: "destructive" });},0);
                itemActionSuccessful = false;
                return prevSettings;
            }

            const itemToUpdate = { ...newInventory[itemIndex] };
            itemUsedOrDiscarded = itemToUpdate;
            
            let changes: Partial<AdventureSettings> = {};

            if (action === 'use') {
                if (itemToUpdate.effectType === 'combat' && activeCombat?.isActive) {
                    // Logic for combat items is now handled via setItemToUse/setIsTargeting
                    setItemToUse(itemToUpdate);
                    setIsTargeting(true);
                    itemActionSuccessful = false; // Don't proceed with narrative action yet
                    return prevSettings;
                }
                
                narrativeAction = `J'utilise ${itemToUpdate.name}.`;
                if (itemToUpdate.type === 'consumable') {
                    if (itemToUpdate.effectDetails) {
                        if (itemToUpdate.effectDetails.type === 'heal') {
                            const hpChange = itemToUpdate.effectDetails.amount;
                            const newPlayerHp = Math.min(prevSettings.playerMaxHp || 0, (prevSettings.playerCurrentHp || 0) + hpChange);
                            changes = { playerCurrentHp: newPlayerHp };
                            effectAppliedMessage = `${itemToUpdate.name} utilisé. PV restaurés: ${hpChange}.`;
                        } else if(activeCombat?.isActive) {
                           setItemToUse(itemToUpdate);
                           setIsTargeting(true);
                           itemActionSuccessful = false;
                           return prevSettings;
                        } else {
                           toast({ title: "Utilisation en Combat Requise", description: `L'effet de ${itemToUpdate.name} est destiné au combat.`, variant: "default" });
                           itemActionSuccessful = false;
                           return prevSettings;
                        }
                    } else if (itemToUpdate.effectType === 'narrative') {
                        toast({ title: "Utilisation Narrative", description: `L'effet de ${itemToUpdate?.name} est narratif.`, variant: "default" });
                    }
                    newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                    itemActionSuccessful = true;

                } else if (itemToUpdate.type === 'weapon' || itemToUpdate.type === 'armor' || itemToUpdate.type === 'jewelry') {
                    // Prevent "using" equippable items, direct them to equip
                     setTimeout(() => {toast({ title: "Action Requise", description: `Veuillez "Équiper" ${itemToUpdate?.name} plutôt que de l'utiliser.`, variant: "default" });},0);
                    itemActionSuccessful = false;
                    return prevSettings;
                } else { // misc or quest items
                     if (itemToUpdate.description?.toLowerCase().includes('familier')) {
                         // This path is now taken only for specific familiar items
                         handleUseFamiliarItem(itemToUpdate);
                         newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                         itemActionSuccessful = true;
                         // The handleUseFamiliarItem will create its own narrative
                         narrativeAction = "";
                         effectAppliedMessage = "";
                     } else {
                        setTimeout(() => {toast({ title: "Utilisation Narrative", description: `L'effet de ${itemToUpdate?.name} est narratif.`, variant: "default" });},0);
                        newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                        itemActionSuccessful = true;
                     }
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${itemToUpdate.name}.`;
                newInventory[itemIndex] = { ...itemToUpdate, quantity: itemToUpdate.quantity - 1 };
                effectAppliedMessage = `${itemToUpdate.name} a été jeté.`;
                if (itemToUpdate.isEquipped) {
                    if (prevSettings.equippedItemIds?.weapon === itemToUpdate.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), weapon: null };
                    else if (prevSettings.equippedItemIds?.armor === itemToUpdate.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), armor: null };
                    else if (prevSettings.equippedItemIds?.jewelry === itemToUpdate.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), jewelry: null };
                    newInventory[itemIndex].isEquipped = false;
                }
                itemActionSuccessful = true;
            }

            if (newInventory[itemIndex]?.quantity <= 0) {
                newInventory.splice(itemIndex, 1);
            }
            changes.playerInventory = newInventory;
            
            const newSettings = { ...prevSettings, ...changes };
            
            if(changes.equippedItemIds) {
                const effectiveStats = calculateEffectiveStats(newSettings);
                return { ...newSettings, ...effectiveStats };
            }
            
            return newSettings;
        });

        if (itemActionSuccessful && narrativeAction) {
             if(effectAppliedMessage) {
                setTimeout(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); }, 0);
            }
            handleNarrativeUpdate(narrativeAction, 'user');
            callGenerateAdventure(narrativeAction);
        }
    });
  }, [
    callGenerateAdventure, handleNarrativeUpdate, toast, handleUseFamiliarItem, activeCombat
  ]);


  const handleSellItem = React.useCallback((itemId: string) => {
        const currentSettings = adventureSettings;
        const itemToSell = currentSettings.playerInventory?.find(invItem => invItem.id === itemId);

        if (!currentSettings.rpgMode || !itemToSell || itemToSell.quantity <= 0) {
            setTimeout(() => {
                toast({ title: "Vente Impossible", description: "Le mode RPG doit être actif et l'objet doit être dans votre inventaire.", variant: "default" });
            }, 0);
            return;
        }

        let sellPricePerUnit = 0;
        if (itemToSell.goldValue && itemToSell.goldValue > 0) {
            sellPricePerUnit = Math.floor(itemToSell.goldValue / 2);
            if (sellPricePerUnit === 0) {
                sellPricePerUnit = 1;
            }
        }
        if (itemToSell.goldValue === 1) {
             sellPricePerUnit = 1;
        }


        if (sellPricePerUnit <= 0) {
            setTimeout(() => {
                toast({ title: "Invendable", description: `"${itemToSell.name}" n'a pas de valeur marchande.`, variant: "default" });
            }, 0);
            return;
        }

        if (itemToSell.quantity > 1) {
            setItemToSellDetails({ item: itemToSell, sellPricePerUnit: sellPricePerUnit });
            setSellQuantity(1);
        } else {
            confirmSellMultipleItems(1, itemToSell, sellPricePerUnit);
        }
  }, [toast, adventureSettings]);


  const confirmSellMultipleItems = React.useCallback((quantityToSell: number, itemBeingSold?: PlayerInventoryItem, pricePerUnit?: number) => {
    const itemToProcess = itemBeingSold || itemToSellDetails?.item;
    const finalPricePerUnit = pricePerUnit || itemToSellDetails?.sellPricePerUnit;

    if (!itemToProcess || finalPricePerUnit === undefined || finalPricePerUnit <= 0) {
        setTimeout(() => {
            toast({ title: "Erreur de Vente", description: "Détails de l'objet ou prix invalide.", variant: "destructive" });
        }, 0);
        setItemToSellDetails(null);
        return;
    }

    if (quantityToSell <= 0 || quantityToSell > itemToProcess.quantity) {
        setTimeout(() => {
            toast({ title: "Quantité Invalide", description: `Veuillez entrer une quantité entre 1 et ${itemToProcess.quantity}.`, variant: "destructive" });
        }, 0);
        return;
    }

    React.startTransition(() => {
        let itemSoldSuccessfully = false;
        let totalSellPrice = 0;
        let userAction = "";

        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;

            const itemIndex = prevSettings.playerInventory.findIndex(invItem => invItem.id === itemToProcess.id);
            if (itemIndex === -1 || prevSettings.playerInventory[itemIndex].quantity < quantityToSell) {
                return prevSettings;
            }

            totalSellPrice = finalPricePerUnit * quantityToSell;
            const newInventory = [...prevSettings.playerInventory];
            const updatedItem = { ...newInventory[itemIndex] };
            updatedItem.quantity -= quantityToSell;
            
            let changes: Partial<AdventureSettings> = {};
            
            if (updatedItem.quantity <= 0) {
                 if (updatedItem.isEquipped) {
                    if (prevSettings.equippedItemIds?.weapon === updatedItem.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), weapon: null };
                    else if (prevSettings.equippedItemIds?.armor === updatedItem.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), armor: null };
                    else if (prevSettings.equippedItemIds?.jewelry === updatedItem.id) changes.equippedItemIds = { ...(prevSettings.equippedItemIds || {}), jewelry: null };
                    updatedItem.isEquipped = false;
                 }
                newInventory.splice(itemIndex, 1);
            } else {
                newInventory[itemIndex] = updatedItem;
            }

            itemSoldSuccessfully = true;
            userAction = `Je vends ${quantityToSell} ${itemToProcess.name}${quantityToSell > 1 ? 's' : ''}.`;
            
             const newSettings = {
                ...prevSettings,
                ...changes,
                playerInventory: newInventory,
                playerGold: (prevSettings.playerGold ?? 0) + totalSellPrice,
            };
            
            if(changes.equippedItemIds) {
                const effectiveStats = calculateEffectiveStats(newSettings);
                return { ...newSettings, ...effectiveStats };
            }

            return newSettings;
        });

        if (itemSoldSuccessfully) {
            setTimeout(() => {
                toast({ title: "Objet(s) Vendu(s)!", description: `Vous avez vendu ${quantityToSell} ${itemToProcess.name} pour ${totalSellPrice} pièces d'or.` });
            }, 0);

            handleNarrativeUpdate(userAction, 'user');
            callGenerateAdventure(userAction);
        }
    });
    setItemToSellDetails(null);
  }, [itemToSellDetails, callGenerateAdventure, handleNarrativeUpdate, toast]);


  const handleEquipItem = React.useCallback((itemIdToEquip: string) => {
    setAdventureSettings(prevSettings => {
        if (!prevSettings.rpgMode || !prevSettings.playerInventory) return prevSettings;
        const item = prevSettings.playerInventory.find(i => i.id === itemIdToEquip);
        if (!item || item.quantity <= 0) {
            setTimeout(() => { toast({ title: "Erreur", description: "Objet introuvable ou quantité insuffisante.", variant: "destructive" }); }, 0);
            return prevSettings;
        }

        let slotToEquip: keyof NonNullable<AdventureSettings['equippedItemIds']> | null = null;
        if (item.type === 'weapon') slotToEquip = 'weapon';
        else if (item.type === 'armor') slotToEquip = 'armor';
        else if (item.type === 'jewelry') slotToEquip = 'jewelry';

        if (!slotToEquip) {
            setTimeout(() => { toast({ title: "Non Équipable", description: `"${item.name}" n'est pas un objet équipable dans un slot standard.`, variant: "default" }); }, 0);
            return prevSettings;
        }

        const newEquippedItemIds = { ...(prevSettings.equippedItemIds || { weapon: null, armor: null, jewelry: null }) };
        const newInventory = prevSettings.playerInventory.map(invItem => ({ ...invItem }));

        const currentEquippedItemId = newEquippedItemIds[slotToEquip];
        if (currentEquippedItemId) {
            const currentlyEquippedItemIndex = newInventory.findIndex(i => i.id === currentEquippedItemId);
            if (currentlyEquippedItemIndex > -1) {
                newInventory[currentlyEquippedItemIndex].isEquipped = false;
            }
        }

        newEquippedItemIds[slotToEquip] = item.id;
        const newItemIndex = newInventory.findIndex(i => i.id === item.id);
        if (newItemIndex > -1) {
            newInventory[newItemIndex].isEquipped = true;
        } else {
            console.error("Item to equip not found in inventory during map");
            return prevSettings;
        }

        const updatedSettings = {
            ...prevSettings,
            equippedItemIds: newEquippedItemIds,
            playerInventory: newInventory,
        };

        const effectiveStats = calculateEffectiveStats(updatedSettings);

        setTimeout(() => { toast({ title: "Objet Équipé", description: `${item.name} a été équipé.` }); }, 0);
        return {
            ...updatedSettings,
            ...effectiveStats,
        };
    });
  }, [toast]);

  const handleUnequipItem = React.useCallback((slotToUnequip: keyof NonNullable<AdventureSettings['equippedItemIds']>) => {
      setAdventureSettings(prevSettings => {
          if (!prevSettings.rpgMode || !prevSettings.equippedItemIds || !prevSettings.playerInventory) return prevSettings;

          const itemIdToUnequip = prevSettings.equippedItemIds[slotToUnequip];
          if (!itemIdToUnequip) {
              setTimeout(() => { toast({ title: "Information", description: `Aucun objet à déséquiper dans le slot ${slotToUnequip}.`, variant: "default" }); }, 0);
              return prevSettings;
          }

          const newEquippedItemIds = { ...prevSettings.equippedItemIds, [slotToUnequip]: null };
          const newInventory = prevSettings.playerInventory.map(invItem => {
              if (invItem.id === itemIdToUnequip) {
                  return { ...invItem, isEquipped: false };
              }
              return invItem;
          });

          const itemUnequipped = prevSettings.playerInventory.find(i => i.id === itemIdToUnequip);

          const updatedSettings = {
              ...prevSettings,
              equippedItemIds: newEquippedItemIds,
              playerInventory: newInventory,
          };

          const effectiveStats = calculateEffectiveStats(updatedSettings);

          setTimeout(() => { toast({ title: "Objet Déséquipé", description: `${itemUnequipped?.name || 'Objet'} a été déséquipé.` }); }, 0);
          return {
              ...updatedSettings,
              ...effectiveStats,
          };
      });
  }, [toast]);


    const handleDiscardLoot = React.useCallback((messageId: string) => {
        React.startTransition(() => {
            setNarrativeMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === messageId ? { ...msg, lootTaken: true } : msg
                )
            );
        });
        setTimeout(() => {toast({ title: "Objets Laissés", description: "Vous avez décidé de ne pas prendre ces objets." });},0);
    }, [toast]);

   const handleEditMessage = React.useCallback((messageId: string, newContent: string, newImageTransform?: ImageTransform, newImageUrl?: string) => {
       React.startTransition(() => {
           setNarrativeMessages(prev => prev.map(msg =>
               msg.id === messageId ? { 
                   ...msg, 
                   content: newContent, 
                   timestamp: Date.now(),
                   imageUrl: newImageUrl !== undefined ? newImageUrl : msg.imageUrl,
                   imageTransform: newImageTransform || msg.imageTransform,
                } : msg
           ));
       });
        setTimeout(() => {
            toast({ title: "Message Modifié" });
        }, 0);
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;

        React.startTransition(() => {
            setNarrativeMessages(prevNarrative => {
                if (prevNarrative.length <= 1 && prevNarrative[0]?.type === 'system') {
                     messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler après l'introduction.", variant: "destructive" };
                     return prevNarrative;
                }

                let lastUserIndex = -1;
                for (let i = prevNarrative.length - 1; i >= 0; i--) {
                    if (prevNarrative[i].type === 'user') {
                        lastUserIndex = i;
                        break;
                    }
                }

                if (lastUserIndex !== -1) {
                    const aiMessageBeforeUserAction = prevNarrative[lastUserIndex -1];
                    if (aiMessageBeforeUserAction?.sceneDescription?.toLowerCase().includes("combat started") ||
                        aiMessageBeforeUserAction?.content.toLowerCase().includes("combat commence")) {
                        newActiveCombatState = undefined;
                    }
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    messageForToast = { title: "Dernier tour annulé" };
                    return newNarrative;
                } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') {
                     const newNarrative = prevNarrative.slice(0, -1);
                     messageForToast = { title: "Dernier message IA annulé" };
                     return newNarrative;
                }
                messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
                return prevNarrative;
            });
            setActiveCombat(newActiveCombatState);
        });
        if (messageForToast) {
             setTimeout(() => { toast(messageForToast as Parameters<typeof toast>[0]); }, 0);
        }
    }, [toast, activeCombat]);


    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating || isLoading) return;
         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = [];
         let lastAiIndex = -1;
         const currentNarrative = [...narrativeMessages];

         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) {
                 lastUserAction = message.content;
                 contextMessages = currentNarrative.slice(Math.max(0, i - 4), i + 1);
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
            setTimeout(() => {
                toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
            },0);
             return;
         }
        React.startTransition(() => {
         setIsRegenerating(true);
        });
         setTimeout(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); },0);

        const currentTurnSettings = JSON.parse(JSON.stringify(adventureSettings)) as AdventureSettings;
        const effectiveStatsThisTurn = calculateEffectiveStats(currentTurnSettings);
        const currentGlobalCharactersRegen = characters;
        let currentActiveCombatRegen: ActiveCombat | undefined = activeCombat ? JSON.parse(JSON.stringify(activeCombat)) : undefined;

        if (currentTurnSettings.rpgMode && currentActiveCombatRegen?.isActive) {
            const combatantsForAIRegenMap = new Map<string, Combatant>();
            
            const playerCombatantRegen: Combatant = {
                characterId: PLAYER_ID, 
                name: currentTurnSettings.playerName || "Player", 
                currentHp: currentTurnSettings.playerCurrentHp ?? effectiveStatsThisTurn.playerMaxHp,
                maxHp: effectiveStatsThisTurn.playerMaxHp,
                currentMp: currentTurnSettings.playerCurrentMp ?? effectiveStatsThisTurn.playerMaxMp,
                maxMp: effectiveStatsThisTurn.playerMaxMp,
                team: 'player', 
                isDefeated: (currentTurnSettings.playerCurrentHp ?? effectiveStatsThisTurn.playerMaxHp) <=0, 
                statusEffects: currentActiveCombatRegen?.combatants.find(c => c.characterId === PLAYER_ID)?.statusEffects || [],
            };
            combatantsForAIRegenMap.set(PLAYER_ID, playerCombatantRegen);
            
            currentGlobalCharactersRegen.forEach(char => {
                if (char.isAlly && (char.hitPoints ?? 0) > 0) {
                    const existingCombatantData = currentActiveCombatRegen?.combatants.find(c => c.characterId === char.id);
                    const allyCombatantRegen: Combatant = {
                        characterId: char.id, name: char.name,
                        currentHp: existingCombatantData?.currentHp ?? char.hitPoints!,
                        maxHp: existingCombatantData?.maxHitPoints!,
                        currentMp: existingCombatantData?.currentMp ?? char.manaPoints,
                        maxMp: existingCombatantData?.maxManaPoints,
                        team: 'player', isDefeated: existingCombatantData ? existingCombatantData.isDefeated : (char.hitPoints! <= 0),
                        statusEffects: existingCombatantData?.statusEffects || char.statusEffects || [],
                    };
                    combatantsForAIRegenMap.set(char.id, allyCombatantRegen);
                }
            });
            
            currentActiveCombatRegen?.combatants.forEach(c => {
                if (c.team === 'enemy' && !combatantsForAIRegenMap.has(c.characterId)) {
                    combatantsForAIRegenMap.set(c.characterId, c);
                } else if (c.team === 'enemy' && combatantsForAIRegenMap.has(c.characterId)) {
                    combatantsForAIRegenMap.set(c.characterId, c);
                }
            });

            currentActiveCombatRegen.combatants = Array.from(combatantsForAIRegenMap.values());
            console.log('[LOG_PAGE_TSX] Combatants sent to AI (handleRegenerateLastResponse):', JSON.stringify(currentActiveCombatRegen.combatants.map(c => ({ id: c.characterId, name: c.name, team: c.team, hp: c.currentHp, mp: c.currentMp }))));
        }
        
        const currentPlayerLocation = currentTurnSettings.playerLocationId
        ? currentTurnSettings.mapPointsOfInterest?.find(poi => poi.id === currentTurnSettings.playerLocationId)
        : undefined;


         try {
             const input: GenerateAdventureInput = {
                 world: currentTurnSettings.world,
                 initialSituation: contextMessages.map(msg => msg.type === 'user' ? `${currentTurnSettings.playerName || 'Player'}: ${msg.content}` : msg.content ).join('\n\n'),
                 characters: currentGlobalCharactersRegen.filter(c => c.locationId === currentTurnSettings.playerLocationId), 
                 userAction: lastUserAction,
                 currentLanguage: currentLanguage,
                 playerName: currentTurnSettings.playerName || "Player",
                 relationsModeActive: currentTurnSettings.relationsMode ?? true,
                 rpgModeActive: currentTurnSettings.rpgMode ?? false,
                 activeCombat: currentActiveCombatRegen,
                 playerGold: currentTurnSettings.playerGold,
                 playerSkills: currentTurnSettings.playerSkills,
                 playerClass: currentTurnSettings.playerClass,
                 playerLevel: currentTurnSettings.playerLevel,
                 playerCurrentHp: currentTurnSettings.playerCurrentHp,
                 playerMaxHp: effectiveStatsThisTurn.playerMaxHp,
                 playerCurrentMp: currentTurnSettings.playerCurrentMp,
                 playerMaxMp: effectiveStatsThisTurn.playerMaxMp,
                 playerCurrentExp: currentTurnSettings.playerCurrentExp,
                 playerExpToNextLevel: effectiveStatsThisTurn.playerExpToNextLevel,
                 playerStrength: effectiveStatsThisTurn.playerStrength,
                 playerDexterity: effectiveStatsThisTurn.playerDexterity,
                 playerConstitution: currentTurnSettings.playerConstitution,
                 playerIntelligence: currentTurnSettings.playerIntelligence,
                 playerWisdom: currentTurnSettings.playerWisdom,
                 playerCharisma: currentTurnSettings.playerCharisma,
                 playerArmorClass: currentTurnSettings.playerArmorClass,
                 playerAttackBonus: currentTurnSettings.playerAttackBonus,
                 playerDamageBonus: currentTurnSettings.playerDamageBonus,
                 equippedWeaponName: currentTurnSettings.equippedItemIds?.weapon ? currentTurnSettings.playerInventory?.find(i => i.id === currentTurnSettings.equippedItemIds?.weapon)?.name : undefined,
                 equippedArmorName: currentTurnSettings.equippedItemIds?.armor ? currentTurnSettings.playerInventory?.find(i => i.id === currentTurnSettings.equippedItemIds?.armor)?.name : undefined,
                 equippedJewelryName: currentTurnSettings.equippedItemIds?.jewelry ? currentTurnSettings.playerInventory?.find(i => i.id === currentTurnSettings.equippedItemIds?.jewelry)?.name : undefined,
                 playerLocationId: currentTurnSettings.playerLocationId,
                 mapPointsOfInterest: currentTurnSettings.mapPointsOfInterest,
                 playerLocation: currentPlayerLocation,
                 aiConfig: aiConfig,
                 timeManagement: currentTurnSettings.timeManagement,
                 playerPortraitUrl: currentTurnSettings.playerPortraitUrl,
                 playerFaceSwapEnabled: currentTurnSettings.playerFaceSwapEnabled,
             };

             const result: GenerateAdventureFlowOutput = await generateAdventure(input);

             if (result.error) {
                setTimeout(() => {
                    toast({ title: "Erreur de Régénération IA", description: result.error, variant: "destructive"});
                },0);
                setIsRegenerating(false);
                return;
             }

            React.startTransition(() => {
                setNarrativeMessages(prev => {
                    const newNarrative = [...prev];
                    const newAiMessage: Message = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        type: 'ai',
                        content: result.narrative,
                        timestamp: Date.now(),
                        sceneDescription: result.sceneDescriptionForImage,
                        loot: (result.itemsObtained || []).map(item => ({
                           id: item.itemName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                           name: item.itemName,
                           quantity: item.quantity,
                           description: item.description,
                           effect: item.effect,
                           type: item.itemType,
                           goldValue: item.goldValue,
                           statBonuses: item.statBonuses,
                           generatedImageUrl: null,
                           isEquipped: false,
                        })),
                        lootTaken: false,
                    };
                    if (lastAiIndex !== -1) {
                        newNarrative.splice(lastAiIndex, 1, newAiMessage);
                    } else {
                        newNarrative.push(newAiMessage);
                    }
                    return newNarrative;
                });

                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                 if (result.newFamiliars) result.newFamiliars.forEach(handleNewFamiliar);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if (currentTurnSettings.timeManagement?.enabled && result.updatedTime) handleTimeUpdate(result.updatedTime.newEvent);
                 if (adventureSettings.rpgMode && typeof result.currencyGained === 'number' && result.currencyGained !== 0 && adventureSettings.playerGold !== undefined) {
                    const amount = result.currencyGained;
                    if (amount < 0) {
                        const currentGold = adventureSettings.playerGold ?? 0;
                        if (currentGold + amount < 0) {
                        } else {
                             addCurrencyToPlayer(amount);
                        }
                    } else {
                         addCurrencyToPlayer(amount);
                    }
                    setTimeout(() => {
                        toast({
                            title: amount > 0 ? "Monnaie (Régén.)!" : "Dépense (Régén.)!",
                            description: `Votre trésorerie a été mise à jour.`
                        });
                    }, 0);
                }
                setTimeout(() => {toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });},0);
            });
         } catch (error) { 
             console.error("[LOG_PAGE_TSX][handleRegenerateLastResponse] Critical error:", error);
             let toastDescription = `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`;
              setTimeout(() => {
                toast({ title: "Erreur Critique de Régénération", description: toastDescription, variant: "destructive"});
              },0);
         } finally {
             React.startTransition(() => {
                setIsRegenerating(false);
             });
         }
     }, [
         isRegenerating, isLoading, narrativeMessages, currentLanguage, toast,
         handleNewFamiliar,
         handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates,
         handleRelationUpdatesFromAI, addCurrencyToPlayer, handlePoiOwnershipChange,
         adventureSettings, characters, activeCombat, aiConfig, handleTimeUpdate
     ]);

  const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       setStagedCharacters(prev => {
           return prev.map(c => {
               if (c.id === updatedCharacter.id) {
                   let charToUpdate = {...updatedCharacter};
                   if (charToUpdate.isAlly && (!c.isAlly || c.level === undefined) && adventureSettings.rpgMode) { 
                       if (charToUpdate.level === undefined) charToUpdate.level = 1;
                       if (charToUpdate.currentExp === undefined) charToUpdate.currentExp = 0;
                       if (charToUpdate.expToNextLevel === undefined || charToUpdate.expToNextLevel <= 0) {
                           charToUpdate.expToNextLevel = Math.floor(100 * Math.pow(1.5, (charToUpdate.level || 1) - 1));
                       }
                       if (charToUpdate.initialAttributePoints === undefined) {
                           charToUpdate.initialAttributePoints = INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT;
                       }
                       const attributesToInit: (keyof Character)[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
                       attributesToInit.forEach(attr => {
                           if (charToUpdate[attr] === undefined) {
                               (charToUpdate[attr] as any) = BASE_ATTRIBUTE_VALUE;
                           }
                       });
                       const derived = calculateBaseDerivedStats(charToUpdate);
                       charToUpdate.maxHitPoints = charToUpdate.maxHitPoints ?? derived.maxHitPoints;
                       charToUpdate.hitPoints = charToUpdate.hitPoints ?? charToUpdate.maxHitPoints;
                       if (charToUpdate.characterClass?.toLowerCase().includes('mage') || charToUpdate.characterClass?.toLowerCase().includes('sorcier')) {
                           charToUpdate.maxManaPoints = charToUpdate.maxManaPoints ?? derived.maxManaPoints;
                           charToUpdate.manaPoints = charToUpdate.manaPoints ?? charToUpdate.maxManaPoints;
                       } else if (charToUpdate.maxManaPoints === undefined) {
                           charToUpdate.maxManaPoints = 0;
                           charToUpdate.manaPoints = 0;
                       }
                       charToUpdate.armorClass = charToUpdate.armorClass ?? derived.armorClass;
                       charToUpdate.attackBonus = charToUpdate.attackBonus ?? derived.attackBonus;
                       charToUpdate.damageBonus = charToUpdate.damageBonus ?? derived.damageBonus;

                   }
                   return charToUpdate;
               }
               return c;
           });
       });
   }, [adventureSettings.rpgMode]);


  const handleSaveNewCharacter = React.useCallback((character: Character) => {
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];
                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    existingChars[charIndex] = { ...character, _lastSaved: Date.now() };
                } else {
                    existingChars.push({ ...character, _lastSaved: Date.now() });
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                setTimeout(() => {
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` });
                },0);
                setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } : c));
            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 setTimeout(() => { toast({ title: "Erreur de Sauvegarde Globale", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); },0);
            }
        } else {
            setTimeout(() => {
                toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" });
            },0);
        }
    }, [toast]);

    const handleAddStagedFamiliar = React.useCallback((familiarToAdd: Familiar) => {
        if (adventureSettings.familiars?.some(f => f.id === familiarToAdd.id)) {
            setTimeout(() => {
                 toast({ title: "Familier déjà présent", description: `${familiarToAdd.name} est déjà dans cette aventure.`, variant: "default" });
            }, 0);
            return;
        }

        const updater = (prev: AdventureSettings) => ({
            ...prev,
            familiars: [...(prev.familiars || []), familiarToAdd]
        });

        setAdventureSettings(updater);
        setStagedAdventureSettings(prev => ({...prev, familiars: updater(prev as AdventureSettings).familiars }));

        setTimeout(() => {
            toast({ title: "Familier Ajouté", description: `${familiarToAdd.name} a été ajouté à votre aventure.` });
        }, 0);
    }, [toast, adventureSettings.familiars]);


  const handleAddStagedCharacter = (globalCharToAdd: Character) => {
    const isAlreadyInAdventure = stagedCharacters.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase());

    if (isAlreadyInAdventure) {
        toast({ title: "Personnage déjà présent", description: `${globalCharToAdd.name} est déjà dans l'aventure actuelle.`, variant: "default" });
        return;
    }

    const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
    const newCharRPGMode = adventureSettings.rpgMode;
    const newCharLevel = newCharRPGMode ? (globalCharToAdd.level ?? 1) : undefined;
    const newCharInitialPoints = newCharRPGMode ? (globalCharToAdd.initialAttributePoints ?? INITIAL_CREATION_ATTRIBUTE_POINTS_NPC_DEFAULT) : undefined;
    const newCharCurrentExp = newCharRPGMode ? (globalCharToAdd.currentExp ?? 0) : undefined;
    const newCharExpToNext = newCharRPGMode ? (globalCharToAdd.expToNextLevel ?? Math.floor(100 * Math.pow(1.5, (newCharLevel ?? 1) - 1))) : undefined;

    const newChar: Character = {
        ...globalCharToAdd,
        history: [`Ajouté à l'aventure depuis les personnages globaux le ${new Date().toLocaleString()}`],
        isAlly: globalCharToAdd.isAlly ?? false,
        initialAttributePoints: newCharInitialPoints,
        currentExp: newCharCurrentExp,
        expToNextLevel: newCharExpToNext,
        locationId: adventureSettings.playerLocationId,
        ...(newCharRPGMode ? {
            level: newCharLevel, characterClass: globalCharToAdd.characterClass ?? '', 
            hitPoints: globalCharToAdd.hitPoints ?? globalCharToAdd.maxHitPoints ?? 10, maxHitPoints: globalCharToAdd.maxHitPoints ?? 10,
            manaPoints: globalCharToAdd.manaPoints ?? globalCharToAdd.maxManaPoints ?? 0, maxManaPoints: globalCharToAdd.maxManaPoints ?? 0,
            armorClass: globalCharToAdd.armorClass ?? 10, attackBonus: globalCharToAdd.attackBonus ?? 0, damageBonus: globalCharToAdd.damageBonus ?? "1",
            isHostile: globalCharToAdd.isHostile ?? false,
            strength: globalCharToAdd.strength ?? BASE_ATTRIBUTE_VALUE, dexterity: globalCharToAdd.dexterity ?? BASE_ATTRIBUTE_VALUE, constitution: globalCharToAdd.constitution ?? BASE_ATTRIBUTE_VALUE,
            intelligence: globalCharToAdd.intelligence ?? BASE_ATTRIBUTE_VALUE, wisdom: globalCharToAdd.wisdom ?? BASE_ATTRIBUTE_VALUE, charisma: globalCharToAdd.charisma ?? BASE_ATTRIBUTE_VALUE,

        } : {
            level: undefined, characterClass: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
            armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
            strength: undefined, dexterity: undefined, constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
            initialAttributePoints: undefined, currentExp: undefined, expToNextLevel: undefined,
            }),
            ...(adventureSettings.relationsMode ?? true ? {
            affinity: globalCharToAdd.affinity ?? 50,
            relations: globalCharToAdd.relations || { [PLAYER_ID]: defaultRelation },
            } : { affinity: undefined, relations: undefined, })
    };

    if ((adventureSettings.relationsMode ?? true) && newChar.relations && !newChar.relations[PLAYER_ID]) {
        newChar.relations[PLAYER_ID] = defaultRelation;
    }
    
    setStagedCharacters(prevStagedChars => {
        const updatedPrevChars = prevStagedChars.map(existingChar => {
            if (adventureSettings.relationsMode ?? true) {
                const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                if (newChar.relations && !newChar.relations[existingChar.id]) {
                    newChar.relations[existingChar.id] = defaultRelation;
                }
                return { ...existingChar, relations: updatedRelations };
            }
            return existingChar;
        });
        return [...updatedPrevChars, newChar];
    });

    toast({ title: "Personnage Ajouté à l'Aventure", description: `${globalCharToAdd.name} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications.` });
  };


  const handleSave = React.useCallback(() => {
        const saveData: SaveData = {
            adventureSettings: adventureSettings,
            characters: characters,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat,
            saveFormatVersion: 2.6,
            timestamp: new Date().toISOString(),
            aiConfig: aiConfig,
        };
        const jsonString = JSON.stringify(saveData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aventurier_textuel_${adventureSettings.playerName || 'aventure'}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.createObjectURL(url);
        setTimeout(() => {
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        }, 0);
    }, [narrativeMessages, currentLanguage, toast, adventureSettings, characters, activeCombat, aiConfig]);

    const handleLoad = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const loadedData: Partial<SaveData> = JSON.parse(jsonString);

                if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante.");
                }
                loadAdventureState(loadedData as SaveData);

            } catch (error: any) {
                console.error("Error loading adventure:", error);
                setTimeout(() => {
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                }, 0);
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = '';
    }, [toast, loadAdventureState]);


  const confirmRestartAdventure = React.useCallback(() => {
    React.startTransition(() => {
        const initialSettingsFromBase = JSON.parse(JSON.stringify(baseAdventureSettings));
        const effectiveStats = calculateEffectiveStats(initialSettingsFromBase);
         const newLiveAdventureSettings: AdventureSettings = {
            ...initialSettingsFromBase,
            ...effectiveStats,
            playerCurrentHp: initialSettingsFromBase.rpgMode ? effectiveStats.playerMaxHp : undefined,
            playerCurrentMp: initialSettingsFromBase.rpgMode ? effectiveStats.playerMaxMp : undefined,
            playerCurrentExp: initialSettingsFromBase.rpgMode ? 0 : undefined,
            playerInventory: initialSettingsFromBase.playerInventory?.map((item: PlayerInventoryItem) => ({...item, isEquipped: false})) || [],
            playerGold: initialSettingsFromBase.playerGold ?? (baseAdventureSettings.playerGold ?? 0),
            equippedItemIds: { weapon: null, armor: null, jewelry: null },
            playerSkills: [],
            familiars: [],
        };
        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(JSON.parse(JSON.stringify(baseCharacters)).map((char: Character) => ({
            ...char,
            currentExp: char.level === 1 && initialSettingsFromBase.rpgMode ? 0 : char.currentExp,
            expToNextLevel: char.level === 1 && initialSettingsFromBase.rpgMode ? Math.floor(100 * Math.pow(1.5, ((char.level ?? 1) || 1) - 1)) : char.expToNextLevel,
            hitPoints: char.maxHitPoints,
            manaPoints: char.maxManaPoints,
            statusEffects: [],
        })));
        setStagedAdventureSettings({
            ...JSON.parse(JSON.stringify(newLiveAdventureSettings)),
            characters: JSON.parse(JSON.stringify(baseCharacters)).map((c: Character) => ({ id: c.id, name: c.name, details: c.details, factionColor: c.factionColor, affinity: c.affinity, relations: c.relations, portraitUrl: c.portraitUrl, faceSwapEnabled: c.faceSwapEnabled }))
        });
        setStagedCharacters(JSON.parse(JSON.stringify(baseCharacters)).map((char: Character) => ({
            ...char,
            currentExp: char.level === 1 && initialSettingsFromBase.rpgMode ? 0 : char.currentExp,
            expToNextLevel: char.level === 1 && initialSettingsFromBase.rpgMode ? Math.floor(100 * Math.pow(1.5, ((char.level ?? 1) || 1) - 1)) : char.expToNextLevel,
            hitPoints: char.maxHitPoints,
            manaPoints: char.maxManaPoints,
            statusEffects: [],
        })));
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: initialSettingsFromBase.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined);
        setFormPropKey(prev => prev + 1);
        setShowRestartConfirm(false);
    });
     setTimeout(() => {
        toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
    }, 0);
  }, [baseAdventureSettings, baseCharacters, toast]);

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, []);

  const handleApplyStagedChanges = async () => {
    if (!adventureFormRef.current) return;
    
    const formData = await adventureFormRef.current.getFormData();
    if (!formData) {
        return;
    }

    React.startTransition(() => {
        const newLiveSettings: AdventureSettings = {
            ...adventureSettings,
            ...formData,
            playerCurrentHp: adventureSettings.playerCurrentHp,
            playerCurrentMp: adventureSettings.playerCurrentMp,
            playerCurrentExp: adventureSettings.playerCurrentExp,
            playerInventory: adventureSettings.playerInventory,
            equippedItemIds: adventureSettings.equippedItemIds,
            playerSkills: adventureSettings.playerSkills,
            familiars: adventureSettings.familiars,
        };

        const livePoisMap = new Map((adventureSettings.mapPointsOfInterest || []).map(p => [p.id, p]));
        const stagedPois = newLiveSettings.mapPointsOfInterest || [];
        const mergedPois = stagedPois.map(stagedPoi => {
            const livePoi = livePoisMap.get(stagedPoi.id);
            return livePoi ? { ...livePoi, ...stagedPoi, position: livePoi.position } : stagedPoi;
        });
        newLiveSettings.mapPointsOfInterest = mergedPois;

        if (newLiveSettings.rpgMode) {
            const effectiveStats = calculateEffectiveStats(newLiveSettings);
            Object.assign(newLiveSettings, effectiveStats);
            if (formData.initialSituation !== adventureSettings.initialSituation) {
                newLiveSettings.playerCurrentHp = newLiveSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = newLiveSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
            } else {
                 newLiveSettings.playerCurrentHp = Math.min(adventureSettings.playerCurrentHp ?? effectiveStats.playerMaxHp, effectiveStats.playerMaxHp);
                 newLiveSettings.playerCurrentMp = Math.min(adventureSettings.playerCurrentMp ?? effectiveStats.playerMaxMp, effectiveStats.playerMaxMp);
            }
        }
        
        const formCharactersMap = new Map(formData.characters.map(fc => [fc.id, fc]));
        const updatedCharacters = stagedCharacters.map(sc => {
            const formChar = formCharactersMap.get(sc.id);
            return formChar ? { ...sc, ...formChar } : sc;
        });

        const newCharactersFromForm = formData.characters.filter(fc => !stagedCharacters.some(sc => sc.id === fc.id));
        updatedCharacters.push(...(newCharactersFromForm as Character[]));

        setAdventureSettings(newLiveSettings);
        setCharacters(updatedCharacters); 
        setBaseAdventureSettings(JSON.parse(JSON.stringify(newLiveSettings)));
        setBaseCharacters(JSON.parse(JSON.stringify(updatedCharacters)));

        if (formData.initialSituation !== adventureSettings.initialSituation) {
            setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: newLiveSettings.initialSituation, timestamp: Date.now() }]);
            if (activeCombat) setActiveCombat(undefined);
        }

        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure ont été mis à jour." });
    });
};


  const handleToggleStrategyMode = () => {
      setAdventureSettings(prev => ({ ...prev, strategyMode: !prev.strategyMode }));
  };
  const handleToggleRpgMode = () => {
      setAdventureSettings(prev => ({ ...prev, rpgMode: !prev.rpgMode }));
  };
  const handleToggleRelationsMode = () => {
      setAdventureSettings(prev => ({ ...prev, relationsMode: !prev.relationsMode }));
  };

  const generateDynamicFamiliarBonus = React.useCallback((rarity: Familiar['rarity']): FamiliarPassiveBonus => {
    const statTypes: Array<FamiliarPassiveBonus['type']> = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'armor_class', 'attack_bonus'];
    
    const bonusValues: Record<Familiar['rarity'], number> = {
        'common': 1,
        'uncommon': 2,
        'rare': 5,
        'epic': 10,
        'legendary': 15,
    };
    
    if (Math.random() < 0.2) {
        return {
            type: 'narrative',
            value: 0,
            description: "Rend les PNJ plus enclins à discuter.",
        };
    }
    
    const bonusType = statTypes[Math.floor(Math.random() * statTypes.length)];
    const bonusValue = bonusValues[rarity] || 1;
    let description = `+${bonusValue} en ${bonusType}`;

    switch(bonusType) {
        case 'strength': description = `+${bonusValue} en Force`; break;
        case 'dexterity': description = `+${bonusValue} en Dextérité`; break;
        case 'constitution': description = `+${bonusValue} en Constitution`; break;
        case 'intelligence': description = `+${bonusValue} en Intelligence`; break;
        case 'wisdom': description = `+${bonusValue} en Sagesse`; break;
        case 'charisma': description = `+${bonusValue} en Charisme`; break;
        case 'armor_class': description = `+${bonusValue} en Classe d'Armure`; break;
        case 'attack_bonus': description = `+${bonusValue} au Bonus d'Attaque`; break;
    }

    return {
        type: bonusType,
        value: bonusValue,
        description: description,
    };
}, []);

  const handleMapAction = React.useCallback(async (poiId: string, action: 'travel' | 'examine' | 'collect' | 'attack' | 'upgrade' | 'visit', buildingId?: string) => {
    const poi = adventureSettings.mapPointsOfInterest?.find(p => p.id === poiId);
    if (!poi) return;
  
    setIsLoading(true);
    setShoppingCart([]);
  
    let userActionText = '';
    let locationIdOverride: string | undefined = undefined;
    
    if (action === 'attack') {
        const enemiesAtPoi = baseCharacters.filter(c => c.isHostile && c.locationId === poi.id);

        if (enemiesAtPoi.length === 0) {
            toast({ title: "Aucun ennemi", description: "Il n'y a personne à combattre ici.", variant: "default" });
            setIsLoading(false);
            return;
        }

        const effectiveStats = calculateEffectiveStats(adventureSettings);
        const playerCombatant: Combatant = {
            characterId: PLAYER_ID,
            name: adventureSettings.playerName || 'Player',
            currentHp: adventureSettings.playerCurrentHp ?? 0,
            maxHp: effectiveStats.playerMaxHp,
            currentMp: adventureSettings.playerCurrentMp,
            maxMp: effectiveStats.playerMaxMp,
            team: 'player',
            isDefeated: (adventureSettings.playerCurrentHp ?? 0) <= 0,
            statusEffects: []
        };
        
        const alliesInCombat: Combatant[] = characters
            .filter(c => c.isAlly && (c.hitPoints ?? 0) > 0 && c.locationId === adventureSettings.playerLocationId)
            .map(c => ({
                characterId: c.id,
                name: c.name,
                currentHp: c.hitPoints!,
                maxHp: c.maxHitPoints!,
                currentMp: c.manaPoints,
                maxMp: c.maxManaPoints,
                team: 'player',
                isDefeated: false,
                statusEffects: c.statusEffects || [],
            }));

        const enemiesInCombat: Combatant[] = enemiesAtPoi
            .map(c => ({
                characterId: c.id,
                name: c.name,
                currentHp: c.hitPoints!,
                maxHp: c.maxHitPoints!,
                currentMp: c.manaPoints,
                maxMp: c.maxManaPoints,
                team: 'enemy',
                isDefeated: false,
                statusEffects: c.statusEffects || [],
            }));
        
        const combatState: ActiveCombat = {
            isActive: true,
            combatants: [playerCombatant, ...alliesInCombat, ...enemiesInCombat],
            environmentDescription: poi.description || 'Champ de bataille',
            turnLog: [],
            contestedPoiId: poi.id,
        };

        setActiveCombat(combatState);
        userActionText = `Le combat s'engage à ${poi.name}!`;
        handleNarrativeUpdate(userActionText, 'system');
        
        await callGenerateAdventure(`Je décris l'engagement du combat à ${poi.name}.`, poi.id);

    } else if (action === 'visit' && buildingId) {
        setIsLoading(true);
        locationIdOverride = poi.id;
        const buildingName = BUILDING_DEFINITIONS.find(b => b.id === buildingId)?.name || buildingId;
        userActionText = `Je visite le bâtiment '${buildingName}' à ${poi.name}.`;

        if (buildingId === 'poste-chasse-nocturne') {
            const nocturnalCreatures = [
                { name: 'Loup Spectral', level: 3, hp: 30, ac: 14, attack: 4, damage: '1d8+2' },
                { name: 'Hibou Stellaire', level: 4, hp: 40, ac: 15, attack: 5, damage: '1d6+3' },
                { name: 'Lapin d\'Obsidienne', level: 2, hp: 20, ac: 13, attack: 3, damage: '1d4+1' }
            ];
            const creature = nocturnalCreatures[Math.floor(Math.random() * nocturnalCreatures.length)];
            const tempEnemyId = `nocturnal-${creature.name.toLowerCase().replace(/\s/g, '-')}-${uid()}`;
            
            const tempEnemyCharacter: Character = {
                id: tempEnemyId,
                name: creature.name,
                details: "Une créature de la nuit, nimbée d'une lueur éthérée.",
                isHostile: true,
                level: creature.level, hitPoints: creature.hp, maxHitPoints: creature.hp,
                armorClass: creature.ac, attackBonus: creature.attack, damageBonus: creature.damage,
                locationId: poi.id,
            };
             setCharacters(prev => [...prev, tempEnemyCharacter]);

            const combatants: Combatant[] = [
                 { characterId: PLAYER_ID, name: adventureSettings.playerName || 'Player', team: 'player', currentHp: adventureSettings.playerCurrentHp!, maxHp: adventureSettings.playerMaxHp! },
                 { characterId: tempEnemyId, name: creature.name, team: 'enemy', currentHp: creature.hp, maxHp: creature.hp }
            ];
            const combatState: ActiveCombat = {
                isActive: true,
                combatants: combatants,
                environmentDescription: `Dans les profondeurs sombres de la ${poi.name}.`,
                turnLog: [],
            };
            
            setActiveCombat(combatState);

            const familiarRarityRoll = Math.random();
            let rarity: Familiar['rarity'] = 'common';
            if (familiarRarityRoll < 0.05) rarity = 'legendary';
            else if (familiarRarityRoll < 0.15) rarity = 'epic';
            else if (familiarRarityRoll < 0.4) rarity = 'rare';
            else if (familiarRarityRoll < 0.7) rarity = 'uncommon';
            
            const newFamiliarReward: NewFamiliarSchema = {
                name: creature.name,
                description: `Un ${creature.name.toLowerCase()} capturé lors d'une chasse nocturne.`,
                rarity: rarity,
                passiveBonus: generateDynamicFamiliarBonus(rarity),
            };
            
            setTimeout(() => handleNewFamiliar(newFamiliarReward), 10);
            
            userActionText = `Je commence une chasse nocturne et une créature apparaît !`;
        }

        else {
            let generatedInventory: SellingItem[] = [];
            const activeUniverses = adventureSettings.activeItemUniverses || ['Médiéval-Fantastique'];
            
            let sourcePool: BaseItem[] = [];
            if (buildingId === 'forgeron') {
                sourcePool = [...allWeapons, ...allArmors];
            } else if (buildingId === 'bijoutier') {
                sourcePool = allJewelry;
            } else if (buildingId === 'magicien') {
                sourcePool = allConsumables;
            }
            
            const itemsInUniverse = sourcePool.filter(item => activeUniverses.includes(item.universe));
            const poiLevel = poi.level || 1;
            const rarityOrder: { [key in BaseItem['rarity'] as string]: number } = { 'Commun': 1, 'Rare': 2, 'Epique': 3, 'Légendaire': 4, 'Divin': 5 };
            const maxRarityValue = poiLevel >= 6 ? 5 : poiLevel === 5 ? 4 : poiLevel === 4 ? 3 : poiLevel === 3 ? 2 : 2;
            
            const availableItems = itemsInUniverse.filter(item => (rarityOrder[item.rarity || 'Commun'] || 1) <= maxRarityValue);
            
            const inventorySize = poiLevel >= 6 ? 15 : poiLevel === 5 ? 13 : poiLevel === 4 ? 11 : poiLevel === 3 ? 9 : poiLevel === 2 ? 7 : 5;
            const usedBaseItemIds = new Set<string>();

            if (availableItems.length > 0) {
                for (let i = 0; i < inventorySize; i++) {
                    const baseItem = availableItems[Math.floor(Math.random() * availableItems.length)];
                    if (!baseItem || usedBaseItemIds.has(baseItem.id)) {
                        i--; // try again
                        continue;
                    };

                    usedBaseItemIds.add(baseItem.id);
                    generatedInventory.push({
                        baseItemId: baseItem.id,
                        name: baseItem.name,
                        description: baseItem.description,
                        type: baseItem.type,
                        damage: baseItem.damage,
                        ac: baseItem.ac,
                        rarity: baseItem.rarity || 'Commun',
                        finalGoldValue: baseItem.baseGoldValue,
                        statBonuses: baseItem.statBonuses,
                        effectType: baseItem.effectType,
                        effectDetails: baseItem.effectDetails,
                    });
                }
            }
            
            setMerchantInventory(generatedInventory);
        }

        handleNarrativeUpdate(userActionText, 'user');
        await callGenerateAdventure(userActionText, locationIdOverride);

    } else {
        if (action === 'upgrade') {
            const isPlayerOwned = poi.ownerId === playerId;
            const typeConfig = poiLevelConfig[poi.icon as keyof typeof poiLevelConfig];
            const isUpgradable = isPlayerOwned && typeConfig && (poi.level || 1) < Object.keys(typeConfig).length;
            const upgradeCost = isUpgradable ? typeConfig[(poi.level || 1) as keyof typeof typeConfig]?.upgradeCost : null;
            const canAfford = upgradeCost !== null && (adventureSettings.playerGold || 0) >= upgradeCost;

            if (!isUpgradable || !canAfford) {
                 setTimeout(() => {
                    toast({
                        title: "Amélioration Impossible",
                        description: poi.ownerId !== playerId
                            ? "Vous ne pouvez améliorer que les lieux que vous possédez."
                            : !isUpgradable
                            ? "Ce lieu a atteint son niveau maximum."
                            : "Fonds insuffisants pour cette amélioration.",
                        variant: "destructive"
                    });
                 }, 0);
                 setIsLoading(false);
                return;
            }

            setAdventureSettings(prev => {
                const newPois = prev.mapPointsOfInterest?.map(p => {
                    if (p.id === poiId) {
                        const newLevel = (p.level || 1) + 1;
                        const newResources = poiLevelConfig[p.icon as keyof typeof poiLevelConfig]?.[newLevel]?.resources || [];
                        return { ...p, level: newLevel, resources: newResources };
                    }
                    return p;
                });
                return { ...prev, playerGold: (prev.playerGold || 0) - upgradeCost!, mapPointsOfInterest: newPois };
            });
            toast({ title: "Lieu Amélioré!", description: `${poi.name} est passé au niveau ${(poi.level || 1) + 1} pour ${upgradeCost} PO.` });
            
            userActionText = `Je supervise l'amélioration de ${poi.name}.`;

        } else if (action === 'collect') {
            if (poi.ownerId !== playerId) {
                setTimeout(() => {
                    toast({ title: "Accès Refusé", description: "Vous n'êtes pas le propriétaire de ce lieu et ne pouvez pas collecter ses ressources.", variant: "destructive" });
                }, 0);
                setIsLoading(false);
                return;
            }
             userActionText = `Je collecte les ressources à ${poi.name}.`;
        } else if (action === 'travel') {
            userActionText = `Je me déplace vers ${poi.name}.`;
            locationIdOverride = poi.id;
        } else if (action === 'examine') {
            userActionText = `J'examine les environs de ${poi.name}.`;
            locationIdOverride = poi.id;
        }
        else {
            setIsLoading(false);
            return;
        }
        
        if (!userActionText) { setIsLoading(false); return; }

        handleNarrativeUpdate(userActionText, 'user');

        try {
            await callGenerateAdventure(userActionText, locationIdOverride);
        } catch (error) {
            console.error("Error in handleMapAction trying to generate adventure:", error);
            toast({ title: "Erreur Critique de l'IA", description: "Impossible de générer la suite de l'aventure depuis la carte.", variant: "destructive" });
        }
    }
    
    setIsLoading(false);
  }, [callGenerateAdventure, handleNarrativeUpdate, toast, adventureSettings, characters, baseCharacters, allConsumables, allWeapons, allArmors, allJewelry, handleNewFamiliar, generateDynamicFamiliarBonus]);

  const handlePoiPositionChange = React.useCallback((poiId: string, newPosition: { x: number; y: number }) => {
    setAdventureSettings(prev => {
        if (!prev.mapPointsOfInterest) return prev;
        const newPois = prev.mapPointsOfInterest.map(poi => 
            poi.id === poiId ? { ...poi, position: newPosition } : poi
        );
        return { ...prev, mapPointsOfInterest: newPois };
    });
  }, []);
  
  const handleCreatePoi = React.useCallback((data: { name: string; description: string; type: MapPointOfInterest['icon']; ownerId: string; level: number; buildings: string[] }) => {
    const newPoi: MapPointOfInterest = {
        id: `poi-${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        name: data.name,
        description: data.description || `Un(e) nouveau/nouvelle ${poiLevelNameMap[data.type]?.[data.level || 1]?.toLowerCase() || 'lieu'} plein(e) de potentiel.`,
        icon: data.type,
        level: data.level || 1,
        position: undefined, 
        ownerId: data.ownerId,
        lastCollectedTurn: undefined,
        resources: poiLevelConfig[data.type as keyof typeof poiLevelConfig]?.[data.level as keyof typeof poiLevelNameMap[keyof typeof poiLevelNameMap]]?.resources || [],
        buildings: data.buildings || [],
    };
    
    const updater = (prev: AdventureSettings) => ({
        ...prev,
        mapPointsOfInterest: [...(prev.mapPointsOfInterest || []), newPoi],
    });

    setAdventureSettings(updater);
    setStagedAdventureSettings(prev => ({
        ...prev,
        mapPointsOfInterest: updater(prev as AdventureSettings).mapPointsOfInterest,
    }));
    setFormPropKey(prev => prev + 1);
    
    toast({
        title: "Point d'Intérêt Créé",
        description: `"${data.name}" a été ajouté. Vous pouvez maintenant le placer sur la carte via le bouton "+".`,
    });
}, [toast]);
  
  const handleAddPoiToMap = React.useCallback((poiId: string) => {
    setAdventureSettings(prev => {
        const pois = prev.mapPointsOfInterest || [];
        const poiExists = pois.some(p => p.id === poiId && p.position);
        if (poiExists) {
            toast({ title: "Déjà sur la carte", description: "Ce point d'intérêt est déjà sur la carte.", variant: "default" });
            return prev;
        }

        const newPois = pois.map(p => {
            if (p.id === poiId) {
                toast({ title: "POI Ajouté", description: `"${p.name}" a été ajouté à la carte.` });
                return { ...p, position: { x: 50, y: 50 } };
            }
            return p;
        });

        return { ...prev, mapPointsOfInterest: newPois };
    });
  }, [toast]);


  const stringifiedStagedCharsForFormMemo = React.useMemo(() => {
    return JSON.stringify(stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details, factionColor: c.factionColor, affinity: c.affinity, relations: c.relations, portraitUrl: c.portraitUrl, faceSwapEnabled: c.faceSwapEnabled })));
  }, [stagedCharacters]);


  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    const formCharacters: FormCharacterDefinition[] = JSON.parse(stringifiedStagedCharsForFormMemo);

    const creationPoints = stagedAdventureSettings.playerInitialAttributePoints || INITIAL_CREATION_ATTRIBUTE_POINTS_PLAYER;
    const levelPoints = (stagedAdventureSettings.playerLevel && stagedAdventureSettings.playerLevel > 1)
                        ? ((stagedAdventureSettings.playerLevel - 1) * ATTRIBUTE_POINTS_PER_LEVEL_GAIN_FORM)
                        : 0;
    const totalDistributable = creationPoints + levelPoints;


    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      characters: formCharacters,
      rpgMode: stagedAdventureSettings.rpgMode,
      relationsMode: stagedAdventureSettings.relationsMode,
      strategyMode: stagedAdventureSettings.strategyMode,
      mapPointsOfInterest: stagedAdventureSettings.mapPointsOfInterest,
      playerName: stagedAdventureSettings.playerName,
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerPortraitUrl: stagedAdventureSettings.playerPortraitUrl,
      playerDetails: stagedAdventureSettings.playerDetails,
      playerDescription: stagedAdventureSettings.playerDescription,
      playerOrientation: stagedAdventureSettings.playerOrientation,
      playerFaceSwapEnabled: stagedAdventureSettings.playerFaceSwapEnabled,
      playerInitialAttributePoints: creationPoints,
      totalDistributableAttributePoints: totalDistributable,
      playerStrength: stagedAdventureSettings.playerStrength,
      playerDexterity: stagedAdventureSettings.playerDexterity,
      playerConstitution: stagedAdventureSettings.playerConstitution,
      playerIntelligence: stagedAdventureSettings.playerIntelligence,
      playerWisdom: stagedAdventureSettings.playerWisdom,
      playerCharisma: stagedAdventureSettings.playerCharisma,
      playerGold: stagedAdventureSettings.playerGold,
      familiars: stagedAdventureSettings.familiars || [],
      timeManagement: stagedAdventureSettings.timeManagement,
      activeItemUniverses: stagedAdventureSettings.activeItemUniverses || ['Médiéval-Fantastique'],
    };
  }, [stagedAdventureSettings, stringifiedStagedCharsForFormMemo]);

  const worldForQuestHook = adventureSettings.world;
  const characterNamesForQuestHook = React.useMemo(() => characters.map(c => c.name).join(", "), [characters]);

  const callSuggestQuestHook = React.useCallback(async () => {
    React.startTransition(() => {
      setIsSuggestingQuest(true);
    });
    setTimeout(() => {
      toast({ title: "Suggestion de Quête", description: "L'IA réfléchit à une nouvelle accroche..." });
    }, 0);

    const recentMessages = narrativeMessages.slice(-5).map(m => m.type === 'user' ? `${adventureSettings.playerName}: ${m.content}` : m.content).join('\n');

    try {
      const input: SuggestQuestHookInput = {
        worldDescription: worldForQuestHook,
        currentSituation: recentMessages,
        involvedCharacters: characterNamesForQuestHook,
        language: currentLanguage,
      };
      const result = await suggestQuestHook(input);
      React.startTransition(() => {
        setTimeout(() => {
          toast({
            title: "Suggestion de Quête:",
            description: (
              <div>
                <p className="font-semibold">{result.questHook}</p>
                <p className="text-xs mt-1">({result.justification})</p>
              </div>
            ),
            duration: 9000,
          });
        }, 0);
      });
    } catch (error) {
      console.error("Error suggesting quest hook:", error);
      React.startTransition(() => {
        setTimeout(() => {
          toast({ title: "Erreur", description: "Impossible de suggérer une quête.", variant: "destructive" });
        }, 0);
      });
    } finally {
      React.startTransition(() => {
        setIsSuggestingQuest(false);
      });
    }
  }, [narrativeMessages, characterNamesForQuestHook, worldForQuestHook, currentLanguage, toast, setIsSuggestingQuest, adventureSettings.playerName]);

  const generateSceneImageActionWrapper = React.useCallback(
    async (input: GenerateSceneImageInput): Promise<GenerateSceneImageFlowOutput> => {
        const result = await generateSceneImage(input, aiConfig);
        if (result.error) {
            setTimeout(() => {
                toast({ title: "Erreur de Génération d'Image IA", description: result.error, variant: "destructive" });
            }, 0);
            return { imageUrl: "", error: result.error };
        }
        return result;
    }, [toast, aiConfig]);

    const handleGenerateMapImage = React.useCallback(async () => {
        setIsGeneratingMap(true);
        toast({ title: "Génération de la carte...", description: "L'IA dessine votre monde." });

        const { world, mapPointsOfInterest } = adventureSettings;
        const poiNames = mapPointsOfInterest?.map(poi => poi.name).join(', ') || 'terres inconnues';

        const prompt = `A fantasy map of a world. The style should be that of a hand-drawn map from a classic fantasy novel like "The Lord of the Rings". The map is on aged, weathered parchment. Include artistic details like a compass rose, sea monsters in any oceans, and rolling hills or mountains. Key locations to feature with calligraphic labels are: ${poiNames}. The overall atmosphere is one of ancient adventure. World description for context: ${world}`;

        try {
            const result = await generateSceneImageActionWrapper({ sceneDescription: prompt });
            if (result.imageUrl) {
                setAdventureSettings(prev => ({ ...prev, mapImageUrl: result.imageUrl }));
                toast({ title: "Carte Générée!", description: "Le fond de la carte a été mis à jour." });
            }
        } catch (error) {
            console.error("Error generating map image:", error);
            toast({ title: "Erreur", description: "Impossible de générer le fond de la carte.", variant: "destructive" });
        } finally {
            setIsGeneratingMap(false);
        }
    }, [generateSceneImageActionWrapper, toast, adventureSettings]);

  const handleGenerateItemImage = React.useCallback(async (item: PlayerInventoryItem) => {
    if (isGeneratingItemImage) return;
    setIsGeneratingItemImage(true);
    setTimeout(() => {
        toast({
          title: "Génération d'Image d'Objet",
          description: `Création d'une image pour ${item.name}...`,
        });
    }, 0);

    let promptDescription = `A detailed illustration of a fantasy game item: "${item.name}".`;
    if (item.description) {
      promptDescription += ` Description: ${item.description}.`;
    }
    if (item.effect) {
      promptDescription += ` Effect: ${item.effect}.`;
    }
    if (item.type) {
        promptDescription += ` Type: ${item.type}.`;
    }
    if (item.statBonuses) {
        promptDescription += ` Grants bonuses: ${Object.entries(item.statBonuses).map(([key, value]) => `${key} ${value}`).join(', ')}.`;
    }


    try {
      const result = await generateSceneImageActionWrapper({ sceneDescription: promptDescription });
      if (result.error) { 
        setIsGeneratingItemImage(false); 
        return;
      }
      console.log(`Image générée pour ${item.name}:`, result.imageUrl);

      setAdventureSettings(prevSettings => {
        const newInventory = (prevSettings.playerInventory || []).map(invItem => {
          if (invItem.id === item.id) {
            return { ...invItem, generatedImageUrl: result.imageUrl };
          }
          return invItem;
        });
        return { ...prevSettings, playerInventory: newInventory };
      });

      setTimeout(() => {
          toast({
            title: "Image d'Objet Générée!",
            description: (
              <div className="flex flex-col gap-2">
                <p>{item.name} visualisé.</p>
                {result.imageUrl && <img src={result.imageUrl} alt={item.name} className="w-16 h-16 object-contain border rounded-md" data-ai-hint="generated item image"/>}
                <p className="text-xs">L'image devrait apparaître dans l'inventaire.</p>
              </div>
            ),
            duration: 9000,
          });
      },0);

    } catch (error) { 
      console.error(`Critical error generating image for ${item.name}:`, error);
      setTimeout(() => {
          toast({
            title: "Erreur Critique de Génération d'Image",
            description: `Impossible de générer une image pour ${item.name}. ${error instanceof Error ? error.message : ''}`,
            variant: "destructive",
          });
      },0);

    } finally {
      setIsGeneratingItemImage(false);
    }
  }, [generateSceneImageActionWrapper, toast, isGeneratingItemImage]);
    
  const handleBuildInPoi = React.useCallback((poiId: string, buildingId: string) => {
    const poi = adventureSettings.mapPointsOfInterest?.find(p => p.id === poiId);
    if (!poi || poi.ownerId !== playerId) {
        toast({ title: "Construction Impossible", description: "Vous devez posséder le lieu pour y construire.", variant: "destructive" });
        return;
    }

    const buildingDef = BUILDING_DEFINITIONS.find(b => b.id === buildingId);
    if (!buildingDef) {
        toast({ title: "Erreur", description: "Définition du bâtiment introuvable.", variant: "destructive" });
        return;
    }

    const currentBuildings = poi.buildings || [];
    if (currentBuildings.includes(buildingId)) {
        toast({ title: "Construction Impossible", description: "Ce bâtiment existe déjà dans ce lieu.", variant: "default" });
        return;
    }

    const maxSlots = BUILDING_SLOTS[poi.icon]?.[poi.level || 1] ?? 0;
    if (currentBuildings.length >= maxSlots) {
        toast({ title: "Construction Impossible", description: "Tous les emplacements de construction sont utilisés.", variant: "destructive" });
        return;
    }

    const cost = BUILDING_COST_PROGRESSION[currentBuildings.length] ?? Infinity;
    if ((adventureSettings.playerGold || 0) < cost) {
        toast({ title: "Fonds Insuffisants", description: `Il vous faut ${cost} PO pour construire ${buildingDef.name}.`, variant: "destructive" });
        return;
    }

    setAdventureSettings(prev => {
        const newPois = prev.mapPointsOfInterest!.map(p => {
            if (p.id === poiId) {
                return {
                    ...p,
                    buildings: [...(p.buildings || []), buildingId],
                };
            }
            return p;
        });
        return {
            ...prev,
            playerGold: (prev.playerGold || 0) - cost,
            mapPointsOfInterest: newPois,
        };
    });

    toast({ title: "Bâtiment Construit!", description: `${buildingDef.name} a été construit à ${poi.name} pour ${cost} PO.` });
  }, [adventureSettings, toast]);
    
  const handleFamiliarUpdate = React.useCallback((updatedFamiliar: Familiar) => {
        setAdventureSettings(prevSettings => {
            let newSettings = { ...prevSettings };
            const familiars = newSettings.familiars || [];
            
            const updatedFamiliars = familiars.map(f =>
                f.id === updatedFamiliar.id ? updatedFamiliar : (updatedFamiliar.isActive ? { ...f, isActive: false } : f)
            );
            newSettings.familiars = updatedFamiliars;

            const newEffectiveStats = calculateEffectiveStats(newSettings);
            const finalSettings = { ...newSettings, ...newEffectiveStats };
            
            setStagedAdventureSettings(prevStaged => ({...prevStaged, familiars: finalSettings.familiars }));
            
            return finalSettings;
        });
    }, []);

    const handleSaveFamiliar = React.useCallback((familiarToSave: Familiar) => {
        if (typeof window !== 'undefined') {
            try {
                const existingFamiliarsStr = localStorage.getItem('globalFamiliars');
                let existingFamiliars: Familiar[] = existingFamiliarsStr ? JSON.parse(existingFamiliarsStr) : [];
                const familiarIndex = existingFamiliars.findIndex(f => f.id === familiarToSave.id);

                if (familiarIndex > -1) {
                    existingFamiliars[familiarIndex] = { ...familiarToSave, _lastSaved: Date.now() };
                } else {
                    existingFamiliars.push({ ...familiarToSave, _lastSaved: Date.now() });
                }
                localStorage.setItem('globalFamiliars', JSON.stringify(existingFamiliars));
                toast({ title: "Familier Sauvegardé Globalement", description: `${familiarToSave.name} est maintenant disponible pour d'autres aventures.` });
                
                handleFamiliarUpdate({...familiarToSave, _lastSaved: Date.now()});
                
            } catch (error) {
                 console.error("Failed to save familiar to localStorage:", error);
                 toast({ title: "Erreur de Sauvegarde Globale", description: "Impossible de sauvegarder le familier.", variant: "destructive" });
            }
        }
    }, [toast, handleFamiliarUpdate]);

  const handleMapImageUpload = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast({
            title: "Fichier Invalide",
            description: "Veuillez sélectionner un fichier image (jpeg, png, etc.).",
            variant: "destructive",
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setAdventureSettings(prev => ({ ...prev, mapImageUrl: imageUrl }));
        toast({
            title: "Image de Carte Chargée",
            description: "Le fond de la carte a été mis à jour avec votre image.",
        });
    };
    reader.readAsDataURL(file);
    if(event.target) event.target.value = '';
  }, [toast]);

  const handleMapImageUrlChange = React.useCallback((url: string) => {
    setAdventureSettings(prev => ({ ...prev, mapImageUrl: url }));
    toast({
        title: "Image de Carte Chargée",
        description: "Le fond de la carte a été mis à jour depuis l'URL.",
    });
  }, [toast]);
    
  const handleAiConfigChange = React.useCallback((newConfig: AiConfig) => {
    setAiConfig(newConfig);
    toast({ title: "Configuration IA mise à jour" });
  }, [toast]);
  
    const handleAddToCart = React.useCallback((item: SellingItem) => {
        setShoppingCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.baseItemId === item.baseItemId && cartItem.name === item.name);
            if (existingItem) {
                return prevCart.map(cartItem => 
                    cartItem.baseItemId === item.baseItemId && cartItem.name === item.name 
                    ? { ...cartItem, quantity: (cartItem.quantity || 1) + 1 } 
                    : cartItem
                );
            }
            return [...prevCart, { ...item, quantity: 1 }];
        });
    }, []);

    const handleRemoveFromCart = React.useCallback((itemName: string) => {
        setShoppingCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.name === itemName);
            if (existingItem && existingItem.quantity > 1) {
                 return prevCart.map(cartItem => 
                    cartItem.name === itemName
                    ? { ...cartItem, quantity: cartItem.quantity - 1 } 
                    : cartItem
                );
            }
            return prevCart.filter(cartItem => cartItem.name !== itemName);
        });
    }, []);

    const handleFinalizePurchase = React.useCallback(() => {
        const totalCost = shoppingCart.reduce((acc, item) => acc + (item.finalGoldValue * (item.quantity || 1)), 0);

        if ((adventureSettings.playerGold || 0) < totalCost) {
            toast({ title: "Fonds insuffisants", description: "Vous n'avez pas assez d'or pour cet achat.", variant: "destructive" });
            return;
        }

        setAdventureSettings(prev => {
            const newInventory = [...(prev.playerInventory || [])];
            shoppingCart.forEach(cartItem => {
                const newItem: PlayerInventoryItem = {
                    id: `${cartItem.baseItemId}-${uid()}`,
                    name: cartItem.name,
                    quantity: cartItem.quantity || 1,
                    description: cartItem.description,
                    type: cartItem.type,
                    goldValue: cartItem.finalGoldValue,
                    damage: cartItem.damage,
                    ac: cartItem.ac,
                    statBonuses: cartItem.statBonuses,
                    effectType: cartItem.effectType,
                    effectDetails: cartItem.effectDetails,
                    generatedImageUrl: null,
                    isEquipped: false
                };
                const existingIndex = newInventory.findIndex(invItem => invItem.name === newItem.name);
                if (existingIndex > -1) {
                    newInventory[existingIndex].quantity += newItem.quantity;
                } else {
                    newInventory.push(newItem);
                }
            });
            return { ...prev, playerGold: (prev.playerGold || 0) - totalCost, playerInventory: newInventory };
        });
        
        const boughtItemsSummary = shoppingCart.map(item => `${item.quantity}x ${item.name}`).join(', ');
        toast({ title: "Achat Terminé!", description: `Vous avez acheté : ${boughtItemsSummary}.` });

        handleSendSpecificAction(`J'achète les articles suivants : ${boughtItemsSummary}.`);
        
        setShoppingCart([]);
        setMerchantInventory([]); // Close merchant panel after purchase
    }, [shoppingCart, adventureSettings.playerGold, handleSendSpecificAction, toast]);


    
  const handleGenerateCover = React.useCallback(async () => {
    setIsGeneratingCover(true);
    toast({ title: "Génération de la couverture..."});

    const textContent = comicDraft.map(p => p.panels.map(panel => panel.bubbles.map(b => b.text).join(' ')).join(' ')).join('\n');
    const sceneContent = narrativeMessages.filter(m => m.sceneDescription).map(m => m.sceneDescription).join('. ');
    const prompt = `Comic book cover for a story titled "${comicTitle || 'Untitled'}". The story involves: ${sceneContent}. Key dialogues include: "${textContent.substring(0, 200)}...". Style: epic, detailed, vibrant colors.`;

    try {
        const result = await generateSceneImageActionWrapper({ sceneDescription: prompt, style: "Fantaisie Epique" });
        if (result.imageUrl) {
            setComicCoverUrl(result.imageUrl);
            toast({ title: "Couverture Générée!", description: "La couverture de votre BD est prête." });
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        toast({ title: "Erreur de Génération", description: `Impossible de générer la couverture. ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    } finally {
        setIsGeneratingCover(false);
    }
  }, [comicDraft, comicTitle, narrativeMessages, toast, generateSceneImageActionWrapper]);
    
  const handleSaveToLibrary = React.useCallback(async () => {
    if (!comicTitle.trim()) {
        toast({ title: "Titre requis", description: "Veuillez donner un titre à votre BD.", variant: "destructive" });
        return;
    }
    
    try {
        const compressedDraft: ComicPage[] = await Promise.all(
            comicDraft.map(async (page) => ({
                ...page,
                panels: await Promise.all(page.panels.map(async (panel) => ({
                    ...panel,
                    imageUrl: panel.imageUrl ? await compressImage(panel.imageUrl) : null,
                }))),
            }))
        );

        const newComic = {
            id: uid(),
            title: comicTitle,
            coverUrl: comicCoverUrl,
            comicDraft: compressedDraft,
            createdAt: new Date().toISOString(),
        };

        const existingComicsStr = localStorage.getItem('savedComics_v1');
        const existingComics: any[] = existingComicsStr ? JSON.parse(existingComicsStr) : [];
        
        const comicIndex = existingComics.findIndex((c: { id: string }) => c.id === newComic.id);
        
        if (comicIndex > -1) {
            existingComics[comicIndex] = newComic;
        } else {
            existingComics.push(newComic);
        }
        
        localStorage.setItem('savedComics_v1', JSON.stringify(existingComics));
        
        toast({ title: "BD Sauvegardée!", description: `"${comicTitle}" a été ajouté à votre bibliothèque.` });
        setIsSaveComicDialogOpen(false);
        setComicTitle("");
        setComicCoverUrl(null);
    } catch (e) {
        console.error("Failed to save comic to library:", e);
        toast({
            title: "Erreur de Sauvegarde",
            description: `Impossible de sauvegarder dans la bibliothèque. Le stockage est peut-être plein. Erreur: ${e instanceof Error ? e.message : String(e)}`,
            variant: "destructive"
        });
    }
  }, [comicDraft, comicTitle, comicCoverUrl, toast]);


  const handleAddComicPage = () => {
    setComicDraft(prev => [...prev, createNewComicPage()]);
    setCurrentComicPageIndex(comicDraft.length);
  };

  const handleAddComicPanel = () => {
    if (comicDraft.length === 0) {
        handleAddComicPage();
    } else {
        setComicDraft(prev => prev.map((page, index) => 
            index === currentComicPageIndex ? { ...page, panels: [...page.panels, { id: uid(), imageUrl: null, bubbles: [] }] } : page
        ));
    }
  };

  const handleRemoveLastComicPanel = () => {
    if (comicDraft[currentComicPageIndex]?.panels.length > 0) {
        setComicDraft(prev => prev.map((page, index) => 
            index === currentComicPageIndex ? { ...page, panels: page.panels.slice(0, -1) } : page
        ));
    }
  };

    
  const handleAddToComicPage = (dataUrl: string) => {
    setComicDraft(prev => {
        const draft = prev.length > 0 ? [...prev] : [createNewComicPage()];
        let pageUpdated = false;

        for (let i = currentComicPageIndex; i < draft.length; i++) {
            const page = draft[i];
            const firstEmptyPanelIndex = page.panels.findIndex(p => !p.imageUrl);
            if (firstEmptyPanelIndex !== -1) {
                const newPanels = [...page.panels];
                newPanels[firstEmptyPanelIndex].imageUrl = dataUrl;
                draft[i] = { ...page, panels: newPanels };
                pageUpdated = true;
                toast({ title: "Image Ajoutée", description: `L'image a été ajoutée à la case ${firstEmptyPanelIndex + 1} de la page ${i + 1}.` });
                break;
            }
        }
        
        if (!pageUpdated) {
            const newPage = createNewComicPage();
            newPage.panels[0].imageUrl = dataUrl;
            draft.push(newPage);
            setCurrentComicPageIndex(draft.length - 1);
            toast({ title: "Nouvelle Page Créée", description: "L'image a été ajoutée à une nouvelle page." });
        }
        
        return draft;
    });
  };

  const handleDownloadComicDraft = React.useCallback(() => {
    if (comicDraft.length === 0 || !comicDraft[currentComicPageIndex]) {
        toast({
            title: "Rien à télécharger",
            description: "Il n'y a pas de planche de BD active à télécharger.",
            variant: "destructive"
        });
        return;
    }
    const currentPage = comicDraft[currentComicPageIndex];
    exportPageAsJpeg(currentPage, currentComicPageIndex, toast);
  }, [comicDraft, currentComicPageIndex, toast]);

  const isUiLocked = isLoading || isRegenerating || isSuggestingQuest || isGeneratingItemImage || isGeneratingMap;

  return (
    <>
    <PageStructure
      adventureSettings={adventureSettings}
      characters={characters}
      stagedAdventureSettings={memoizedStagedAdventureSettingsForForm}
      stagedCharacters={stagedCharacters}
      formPropKey={formPropKey}
      handleApplyStagedChanges={handleApplyStagedChanges}
      narrativeMessages={narrativeMessages}
      currentLanguage={currentLanguage}
      fileInputRef={fileInputRef}
      adventureFormRef={adventureFormRef}
      handleToggleRpgMode={handleToggleRpgMode}
      handleToggleRelationsMode={handleToggleRelationsMode}
      handleToggleStrategyMode={handleToggleStrategyMode}
      onNarrativeChange={handleNarrativeUpdate}
      handleCharacterUpdate={handleCharacterUpdate}
      handleNewCharacters={handleNewCharacters}
      handleCharacterHistoryUpdate={handleCharacterHistoryUpdate}
      handleAffinityUpdates={handleAffinityUpdates}
      handleRelationUpdate={(charId, targetId, newRelation) => {
           const currentRelationsMode = adventureSettings.relationsMode ?? true;
           if (!currentRelationsMode) return;
           setStagedCharacters(prevChars =>
             prevChars.map(char => {
               if (char.id === charId) {
                 const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                 return { ...char, relations: updatedRelations };
               }
               if (targetId !== PLAYER_ID && char.id === targetId ) {
                   const sourceChar = prevChars.find(c => c.id === charId);
                   if (sourceChar) {
                       const updatedRelations = { ...(char.relations || {}), [charId]: newRelation };
                       return { ...char, relations: updatedRelations };
                   }
               }
               return char;
             })
           );
      }}
      handleRelationUpdatesFromAI={handleRelationUpdatesFromAI}
      handleSaveNewCharacter={handleSaveNewCharacter}
      handleAddStagedCharacter={handleAddStagedCharacter}
      handleSave={handleSave}
      handleLoad={handleLoad}
      setCurrentLanguage={setCurrentLanguage}
      translateTextAction={translateText}
      generateAdventureAction={callGenerateAdventure}
      generateSceneImageAction={generateSceneImageActionWrapper}
      handleEditMessage={handleEditMessage}
      handleRegenerateLastResponse={handleRegenerateLastResponse}
      handleUndoLastMessage={handleUndoLastMessage}
      playerId={PLAYER_ID}
      playerName={adventureSettings.playerName || "Player"}
      onRestartAdventure={confirmRestartAdventure}
      activeCombat={activeCombat}
      onCombatUpdates={handleCombatUpdates}
      suggestQuestHookAction={callSuggestQuestHook}
      isSuggestingQuest={isSuggestingQuest}
      showRestartConfirm={showRestartConfirm}
      setShowRestartConfirm={setShowRestartConfirm}
      handleTakeLoot={handleTakeLoot}
      handleDiscardLoot={handleDiscardLoot}
      handlePlayerItemAction={handlePlayerItemAction}
      handleSellItem={handleSellItem}
      handleGenerateItemImage={handleGenerateItemImage}
      isGeneratingItemImage={isGeneratingItemImage}
      handleEquipItem={handleEquipItem}
      handleUnequipItem={handleUnequipItem}
      itemToSellDetails={itemToSellDetails}
      sellQuantity={sellQuantity}
      setSellQuantity={setSellQuantity}
      confirmSellMultipleItems={confirmSellMultipleItems}
      onCloseSellDialog={() => setItemToSellDetails(null)}
      handleMapAction={handleMapAction}
      useAestheticFont={useAestheticFont}
      onToggleAestheticFont={handleToggleAestheticFont}
      onGenerateMap={handleGenerateMapImage}
      isGeneratingMap={isGeneratingMap}
      onPoiPositionChange={handlePoiPositionChange}
      onCreatePoi={handleCreatePoi}
      onBuildInPoi={handleBuildInPoi}
      currentTurn={narrativeMessages.length}
      handleNewFamiliar={handleNewFamiliar}
      handleFamiliarUpdate={handleFamiliarUpdate}
      handleSaveFamiliar={handleSaveFamiliar}
      handleAddStagedFamiliar={handleAddStagedFamiliar}
      onMapImageUpload={handleMapImageUpload}
      onMapImageUrlChange={handleMapImageUrlChange}
      onAddPoiToMap={handleAddPoiToMap}
      onUploadToComicPanel={onUploadToComicPanel}
      isLoading={isUiLocked}
      onSaveToLibrary={handleSaveToLibrary}
      aiConfig={aiConfig}
      onAiConfigChange={handleAiConfigChange}
      comicDraft={comicDraft}
      onDownloadComicDraft={handleDownloadComicDraft}
      onAddComicPage={handleAddComicPage}
      onAddComicPanel={handleAddComicPanel}
      onRemoveLastComicPanel={handleRemoveLastComicPanel}
      currentComicPageIndex={currentComicPageIndex}
      onComicPageChange={setCurrentComicPageIndex}
      onAddToComicPage={handleAddToComicPage}
      isSaveComicDialogOpen={isSaveComicDialogOpen}
      setIsSaveComicDialogOpen={setIsSaveComicDialogOpen}
      comicTitle={comicTitle}
      setComicTitle={setComicTitle}
      comicCoverUrl={comicCoverUrl}
      isGeneratingCover={isGeneratingCover}
      onGenerateCover={handleGenerateCover}
      merchantInventory={merchantInventory}
      shoppingCart={shoppingCart}
      onAddToCart={handleAddToCart}
      onRemoveFromCart={handleRemoveFromCart}
      onFinalizePurchase={handleFinalizePurchase}
      onCloseMerchantPanel={() => { setMerchantInventory([]); setShoppingCart([]); }}
    />
     {isTargeting && itemToUse && (
        <AlertDialog open={isTargeting} onOpenChange={setIsTargeting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Choisir une cible pour {itemToUse.name}</AlertDialogTitle>
              <AlertDialogDescription>
                Quel ennemi souhaitez-vous viser ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-2">
              {(activeCombat?.combatants || []).filter(c => c.team === 'enemy' && !c.isDefeated).map(enemy => (
                <Button key={enemy.characterId} variant="outline" className="w-full justify-start" onClick={() => applyCombatItemEffect(enemy.characterId)}>
                    {enemy.name} (PV: {enemy.currentHp}/{enemy.maxHp})
                </Button>
              ))}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setIsTargeting(false); setItemToUse(null); }}>Annuler</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
