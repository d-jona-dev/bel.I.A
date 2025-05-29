
"use client";

import * as React from "react";
import { useToast } from "@/hooks/use-toast";
import type { Character, AdventureSettings, SaveData, Message, ActiveCombat, PlayerInventoryItem, LootedItem, CurrencyTier, StatusEffect } from "@/types"; // Ajout de StatusEffect
import { PageStructure } from "./page.structure";

import { generateAdventure } from "@/ai/flows/generate-adventure";
import type { GenerateAdventureInput, GenerateAdventureOutput, CharacterUpdateSchema, AffinityUpdateSchema, RelationUpdateSchema, NewCharacterSchema, CombatUpdatesSchema, LootedItemSchema } from "@/ai/flows/generate-adventure";
import { generateSceneImage } from "@/ai/flows/generate-scene-image";
import type { GenerateSceneImageInput, GenerateSceneImageOutput } from "@/ai/flows/generate-scene-image";
import { translateText } from "@/ai/flows/translate-text";
import type { TranslateTextInput, TranslateTextOutput } from "@/ai/flows/translate-text";
import { suggestQuestHook } from "@/ai/flows/suggest-quest-hook";
import type { SuggestQuestHookInput, SuggestQuestHookOutput } from "@/ai/flows/suggest-quest-hook";


const PLAYER_ID = "player";

export type FormCharacterDefinition = { id?: string; name: string; details: string };

export type AdventureFormValues = Omit<AdventureSettings, 'characters' | 'playerCurrentHp' | 'playerCurrentMp' | 'playerCurrentExp' | 'playerInventory' | 'playerCurrencyTiers'> & {
  characters: FormCharacterDefinition[];
  currencyLabel?: string;
  currencyTiers?: Array<{name: string; valueInPreviousTier: number; initialAmount?: number}>; // Note: valueInPreviousTier est pour le formulaire, valueInBaseTier est pour AdventureSettings
  playerClass?: string;
  playerLevel?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  playerExpToNextLevel?: number;
};

export default function Home() {
  const [baseAdventureSettings, setBaseAdventureSettings] = React.useState<AdventureSettings>({
    world: "Le village paisible de Bourgenval est niché au bord de la Forêt Murmurante. Récemment, des gobelins plus audacieux qu'à l'accoutumée ont commencé à attaquer les voyageurs et à piller les fermes isolées. Les villageois sont terrifiés.",
    initialSituation: "Vous arrivez à Bourgenval, fatigué par la route. L'Ancienne Elara, la matriarche respectée du village, vous aborde avec un regard inquiet. 'Étranger,' dit-elle, 'votre regard est celui d'un guerrier. Nous avons désespérément besoin d'aide. Les gobelins de la Grotte Grinçante sont devenus une véritable menace. Pourriez-vous nous en débarrasser ?'",
    rpgMode: true,
    relationsMode: true,
    playerName: "Héros",
    playerClass: "Guerrier",
    playerLevel: 1,
    playerMaxHp: 30,
    playerCurrentHp: 30,
    playerMaxMp: 0,
    playerCurrentMp: 0,
    playerExpToNextLevel: 100,
    playerCurrentExp: 0,
    playerInventory: [{name: "Potion de Soin Mineure", quantity: 2, description: "Une fiole rougeâtre qui restaure quelques points de vie.", effect: "Restaure 10 PV", type: "consumable"}, {name: "Dague Rouillée", quantity: 1, description: "Une dague simple et usée.", effect: "Arme de base", type: "weapon"}],
    currencyLabel: "Trésorerie",
    playerCurrencyTiers: [
      { name: "Or", valueInBaseTier: 10000, amount: 0 },
      { name: "Argent", valueInBaseTier: 100, amount: 0 },
      { name: "Cuivre", valueInBaseTier: 1, amount: 15 },
    ],
  });
  const [baseCharacters, setBaseCharacters] = React.useState<Character[]>([
      {
        id: 'elara-1',
        name: "Ancienne Elara",
        details: "Vieille femme sage et respectée de Bourgenval. Elle porte le fardeau des espoirs de son village. Environ 70 ans, cheveux gris tressés, yeux perçants et bienveillants.",
        biographyNotes: "Elara a vu des générations grandir et tomber. Elle est déterminée à protéger Bourgenval, quitte à faire confiance à des étrangers.",
        history: ["A demandé de l'aide au joueur pour les gobelins."],
        portraitUrl: null,
        affinity: 60,
        relations: { [PLAYER_ID]: "Espoir du village" },
        hitPoints: 10, maxHitPoints: 10, characterClass: "Sage", level: 1, isHostile: false,
      },
      {
        id: 'frak-1',
        name: "Frak, Chef Gobelin",
        details: "Un gobelin particulièrement grand et méchant, avec une cicatrice en travers du museau et armé d'une hache rouillée. Il dirige la tribu de la Grotte Grinçante.",
        biographyNotes: "Frak est devenu plus agressif récemment, poussé par une force mystérieuse ou un besoin désespéré.",
        history: ["Dirige les raids contre Bourgenval."],
        portraitUrl: null,
        affinity: 5,
        relations: { [PLAYER_ID]: "Intrus à tuer" },
        hitPoints: 25, maxHitPoints: 25, characterClass: "Chef Gobelin", level: 2, armorClass: 13, attackBonus: 3, damageBonus: "1d8+1", isHostile: true,
        inventory: {"Hache Rouillée": 1, "Quelques Pièces de Cuivre": 12}
      },
      {
        id: 'snirf-1',
        name: "Snirf, Gobelin Fureteur",
        details: "Un petit gobelin agile et sournois, armé d'une courte dague. Sert d'éclaireur pour sa tribu.",
        biographyNotes: "Snirf est plus couard que méchant, mais loyal à Frak par peur.",
        history: ["A été aperçu rôdant près de Bourgenval."],
        portraitUrl: null,
        affinity: 10,
        relations: { [PLAYER_ID]: "Cible facile", "frak-1": "Chef redouté" },
        hitPoints: 8, maxHitPoints: 8, characterClass: "Fureteur Gobelin", level: 1, armorClass: 12, attackBonus: 2, damageBonus: "1d4", isHostile: true,
        inventory: {"Dague Courte": 1, "Cailloux pointus": 5}
      }
  ]);

  const [adventureSettings, setAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [characters, setCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [activeCombat, setActiveCombat] = React.useState<ActiveCombat | undefined>(undefined);
  const [narrativeMessages, setNarrativeMessages] = React.useState<Message[]>([
     { id: `msg-${Date.now()}`, type: 'system', content: baseAdventureSettings.initialSituation, timestamp: Date.now() }
  ]);
  const [currentLanguage, setCurrentLanguage] = React.useState<string>("fr");

  const [stagedAdventureSettings, setStagedAdventureSettings] = React.useState<AdventureSettings>(() => JSON.parse(JSON.stringify(baseAdventureSettings)));
  const [stagedCharacters, setStagedCharacters] = React.useState<Character[]>(() => JSON.parse(JSON.stringify(baseCharacters)));
  const [formPropKey, setFormPropKey] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = React.useState<boolean>(false);
  const [showRestartConfirm, setShowRestartConfirm] = React.useState<boolean>(false);
  const [isSuggestingQuest, setIsSuggestingQuest] = React.useState<boolean>(false);

  const { toast } = useToast();

  React.useEffect(() => {
    const currentBaseAdventureSettings = baseAdventureSettings;
    const currentBaseCharacters = baseCharacters;

    const initialSettings = JSON.parse(JSON.stringify(currentBaseAdventureSettings));
    const newLiveAdventureSettings: AdventureSettings = {
        ...initialSettings,
        playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
        playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
        playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
        playerInventory: initialSettings.playerInventory || [],
        playerCurrencyTiers: initialSettings.playerCurrencyTiers || [],
    };
    const newLiveCharacters = JSON.parse(JSON.stringify(currentBaseCharacters));
    const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: currentBaseAdventureSettings.initialSituation, timestamp: Date.now() }];

    setAdventureSettings(newLiveAdventureSettings);
    setCharacters(newLiveCharacters);
    setNarrativeMessages(newNarrative);
    setActiveCombat(undefined);

    setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
    setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
    setFormPropKey(prev => prev + 1);
  }, [baseAdventureSettings, baseCharacters]);

 React.useEffect(() => {
    setStagedAdventureSettings(prevStaged => {
        const newLiveSettingsCopy = JSON.parse(JSON.stringify(adventureSettings));
        if (JSON.stringify(prevStaged) !== JSON.stringify(newLiveSettingsCopy)) {
            return newLiveSettingsCopy;
        }
        return prevStaged;
    });
    setStagedCharacters(prevStagedChars => {
        const newLiveCharsCopy = JSON.parse(JSON.stringify(characters));
        if (JSON.stringify(prevStagedChars) !== JSON.stringify(newLiveCharsCopy)) {
            return newLiveCharsCopy;
        }
        return prevStagedChars;
    });
  }, [adventureSettings, characters]);

  const handleSettingsUpdate = React.useCallback((newSettingsFromForm: AdventureFormValues) => {
    setStagedAdventureSettings(prevStagedSettings => {
        const defaultCurrencyTiers: CurrencyTier[] = [
            { name: "Or", valueInBaseTier: 10000, amount: 0 },
            { name: "Argent", valueInBaseTier: 100, amount: 0 },
            { name: "Cuivre", valueInBaseTier: 1, amount: 0 },
        ];

        let calculatedTiers = defaultCurrencyTiers;
        if (newSettingsFromForm.currencyTiers && newSettingsFromForm.currencyTiers.length > 0) {
            let cumulativeMultiplier = 1;
            const reversedFormTiers = [...newSettingsFromForm.currencyTiers].reverse();
            calculatedTiers = reversedFormTiers.map((formTier, index) => {
                if (index === 0) {
                    cumulativeMultiplier = 1;
                } else {
                    cumulativeMultiplier *= (reversedFormTiers[index-1].valueInPreviousTier || 100);
                }
                return {
                    name: formTier.name || `Devise ${index +1}`,
                    valueInBaseTier: cumulativeMultiplier,
                    amount: formTier.initialAmount || 0,
                };
            }).reverse();

            if (calculatedTiers.length > 0) {
                const smallestTierValue = calculatedTiers[calculatedTiers.length - 1].valueInBaseTier;
                if (smallestTierValue !== 1) {
                     calculatedTiers = calculatedTiers.map(tier => ({
                        ...tier,
                         valueInBaseTier: tier.valueInBaseTier / smallestTierValue
                     }));
                }
                calculatedTiers[calculatedTiers.length - 1].valueInBaseTier = 1;
            }
        }

        const newSettingsCandidate: AdventureSettings = {
            ...prevStagedSettings,
            world: newSettingsFromForm.world,
            initialSituation: newSettingsFromForm.initialSituation,
            rpgMode: newSettingsFromForm.enableRpgMode ?? false,
            relationsMode: newSettingsFromForm.enableRelationsMode ?? true,
            playerName: newSettingsFromForm.playerName || "Player",
            currencyLabel: newSettingsFromForm.currencyLabel,
            playerCurrencyTiers: calculatedTiers,
            playerClass: newSettingsFromForm.playerClass,
            playerLevel: newSettingsFromForm.playerLevel,
            playerMaxHp: newSettingsFromForm.playerMaxHp,
            playerMaxMp: newSettingsFromForm.playerMaxMp,
            playerExpToNextLevel: newSettingsFromForm.playerExpToNextLevel,
            playerCurrentHp: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentHp : (newSettingsFromForm.enableRpgMode ? newSettingsFromForm.playerMaxHp : undefined),
            playerCurrentMp: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentMp : (newSettingsFromForm.enableRpgMode ? newSettingsFromForm.playerMaxMp : undefined),
            playerCurrentExp: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerCurrentExp : (newSettingsFromForm.enableRpgMode ? 0 : undefined),
            playerInventory: prevStagedSettings.initialSituation === newSettingsFromForm.initialSituation ? prevStagedSettings.playerInventory : (newSettingsFromForm.enableRpgMode ? prevStagedSettings.playerInventory || [] : undefined),
        };
        if (JSON.stringify(prevStagedSettings) !== JSON.stringify(newSettingsCandidate)) {
            return newSettingsCandidate;
        }
        return prevStagedSettings;
    });

    setStagedCharacters(prevStagedChars => {
      const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
      const newRPGMode = newSettingsFromForm.enableRpgMode ?? false;

      let updatedCharsList: Character[] = newSettingsFromForm.characters.map(formDef => {
        const existingChar = formDef.id
            ? prevStagedChars.find(sc => sc.id === formDef.id)
            : prevStagedChars.find(sc => sc.name === formDef.name && !prevStagedChars.some(otherSc => otherSc.id === sc.id && otherSc.id !== formDef.id && !formDef.id));

        if (existingChar) {
          return {
            ...existingChar,
            name: formDef.name,
            details: formDef.details,
            ...(newRPGMode ? {
                level: existingChar.level || 1, experience: existingChar.experience || 0, characterClass: existingChar.characterClass || '',
                stats: existingChar.stats || {}, inventory: existingChar.inventory || {}, skills: existingChar.skills || {},
                spells: existingChar.spells || [], techniques: existingChar.techniques || [], passiveAbilities: existingChar.passiveAbilities || [],
                strength: existingChar.strength ?? 10, dexterity: existingChar.dexterity ?? 10, constitution: existingChar.constitution ?? 10,
                intelligence: existingChar.intelligence ?? 10, wisdom: existingChar.wisdom ?? 10, charisma: existingChar.charisma ?? 10,
                baseHitPoints: existingChar.baseHitPoints ?? 10,
                hitPoints: existingChar.hitPoints ?? existingChar.maxHitPoints ?? 10,
                maxHitPoints: existingChar.maxHitPoints ?? 10,
                manaPoints: existingChar.manaPoints ?? existingChar.maxManaPoints ?? 0,
                maxManaPoints: existingChar.maxManaPoints ?? 0,
                armorClass: existingChar.armorClass ?? 10,
                attackBonus: existingChar.attackBonus ?? 0,
                damageBonus: existingChar.damageBonus ?? "1",
                isHostile: existingChar.isHostile ?? false,
            } : {
                level: undefined, experience: undefined, characterClass: undefined, stats: undefined, inventory: undefined, skills: undefined,
                spells: undefined, techniques: undefined, passiveAbilities: undefined, strength: undefined, dexterity: undefined,
                constitution: undefined, intelligence: undefined, wisdom: undefined, charisma: undefined,
                baseHitPoints: undefined, hitPoints: undefined, maxHitPoints: undefined, manaPoints: undefined, maxManaPoints: undefined,
                armorClass: undefined, attackBonus: undefined, damageBonus: undefined, isHostile: undefined,
             }),
          };
        } else {
          const newId = formDef.id || `${formDef.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          return {
            id: newId, name: formDef.name, details: formDef.details,
            history: [], opinion: {}, portraitUrl: null, affinity: 50,
            relations: { [PLAYER_ID]: defaultRelation },
             ...(newRPGMode ? {
                level: 1, experience: 0, characterClass: '', stats: {}, inventory: {}, skills: {},
                spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
                baseHitPoints: 10, hitPoints: 10, maxHitPoints: 10, manaPoints:0, maxManaPoints:0, armorClass: 10,
                attackBonus: 0, damageBonus: "1", isHostile: false,
            } : {}),
          };
        }
      });

      if (newSettingsFromForm.enableRelationsMode ?? true) {
          updatedCharsList.forEach(char => {
            char.relations = char.relations || {};
            if (!char.relations[PLAYER_ID]) {
                char.relations[PLAYER_ID] = defaultRelation;
            }
            updatedCharsList.forEach(otherChar => {
                if (char.id !== otherChar.id) {
                    if (!char.relations![otherChar.id]) {
                        char.relations![otherChar.id] = defaultRelation;
                    }
                }
            });
          });
      }
       if (JSON.stringify(prevStagedChars) !== JSON.stringify(updatedCharsList)) {
          return updatedCharsList;
      }
      return prevStagedChars;
    });
  }, [currentLanguage]);

  const handleApplyStagedChanges = React.useCallback(() => {
    let initialSituationChanged = false;
    setAdventureSettings(prevLiveSettings => {
        initialSituationChanged = stagedAdventureSettings.initialSituation !== prevLiveSettings.initialSituation;
        let newLiveSettings = JSON.parse(JSON.stringify(stagedAdventureSettings));

        if (initialSituationChanged) {
            if(stagedAdventureSettings.rpgMode) {
                newLiveSettings.playerCurrentHp = stagedAdventureSettings.playerMaxHp;
                newLiveSettings.playerCurrentMp = stagedAdventureSettings.playerMaxMp;
                newLiveSettings.playerCurrentExp = 0;
                newLiveSettings.playerInventory = stagedAdventureSettings.playerInventory || [];
                newLiveSettings.playerLevel = stagedAdventureSettings.playerLevel || 1;
                newLiveSettings.playerCurrencyTiers = stagedAdventureSettings.playerCurrencyTiers?.map(tier => ({...tier, amount: tier.amount || 0})) || [];
            }
        } else {
            newLiveSettings.playerCurrentHp = prevLiveSettings.playerCurrentHp;
            newLiveSettings.playerCurrentMp = prevLiveSettings.playerCurrentMp;
            newLiveSettings.playerCurrentExp = prevLiveSettings.playerCurrentExp;
            newLiveSettings.playerInventory = prevLiveSettings.playerInventory;
            newLiveSettings.playerLevel = prevLiveSettings.playerLevel;
            newLiveSettings.playerCurrencyTiers = prevLiveSettings.playerCurrencyTiers;
        }

        if (stagedAdventureSettings.rpgMode) {
             newLiveSettings.playerCurrentHp = Math.min(newLiveSettings.playerCurrentHp ?? newLiveSettings.playerMaxHp ?? 0, newLiveSettings.playerMaxHp ?? 0);
             newLiveSettings.playerCurrentMp = Math.min(newLiveSettings.playerCurrentMp ?? newLiveSettings.playerMaxMp ?? 0, newLiveSettings.playerMaxMp ?? 0);
        }
        return newLiveSettings;
    });

    if (initialSituationChanged) {
        setNarrativeMessages([{ id: `msg-${Date.now()}`, type: 'system', content: stagedAdventureSettings.initialSituation, timestamp: Date.now() }]);
        setActiveCombat(undefined);
    }

    setCharacters(JSON.parse(JSON.stringify(stagedCharacters)));
    setFormPropKey(prev => prev + 1); // Force re-render of AdventureForm with new initialValues

    setTimeout(() => { // Ensure toast appears after state updates are processed
        toast({ title: "Modifications Enregistrées", description: "Les paramètres de l'aventure et des personnages ont été mis à jour." });
    }, 0);
  }, [stagedAdventureSettings, stagedCharacters, toast]);

   const handleNarrativeUpdate = React.useCallback((content: string, type: 'user' | 'ai', sceneDesc?: string, lootItems?: LootedItemSchema[]) => {
       const newMessage: Message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: type,
            content: content,
            timestamp: Date.now(),
            sceneDescription: type === 'ai' ? sceneDesc : undefined,
            loot: type === 'ai' ? lootItems : undefined,
            lootTaken: false,
       };
       setNarrativeMessages(prevNarrative => [...prevNarrative, newMessage]);
   }, []);

  const addCurrencyToPlayer = React.useCallback((baseAmountToAdd: number) => {
      setAdventureSettings(prevSettings => {
          if (!prevSettings.rpgMode || !prevSettings.playerCurrencyTiers || prevSettings.playerCurrencyTiers.length === 0) {
              return prevSettings;
          }

          let currentTotalInBase = 0;
          prevSettings.playerCurrencyTiers.forEach(tier => {
              currentTotalInBase += (tier.amount || 0) * tier.valueInBaseTier;
          });

          let newTotalInBase = currentTotalInBase + baseAmountToAdd;
          if (newTotalInBase < 0) newTotalInBase = 0; // Prevent negative currency

          const updatedTiers = [...prevSettings.playerCurrencyTiers].map(t => ({...t, amount: 0})); // Reset amounts

          // Distribute newTotalInBase into tiers, from highest value to lowest
          for (let i = 0; i < updatedTiers.length; i++) {
              const tier = updatedTiers[i];
              if (newTotalInBase >= tier.valueInBaseTier) {
                  const count = Math.floor(newTotalInBase / tier.valueInBaseTier);
                  tier.amount = count;
                  newTotalInBase -= count * tier.valueInBaseTier;
              }
          }
          // If there's any remainder, add it to the smallest currency tier
          if (newTotalInBase > 0 && updatedTiers.length > 0) {
               const smallestTierIndex = updatedTiers.length -1; // Smallest tier is last after sorting or by convention
               // Ensure the smallest tier's valueInBaseTier is 1 to avoid division by zero or incorrect logic
               if (updatedTiers[smallestTierIndex].valueInBaseTier === 1) {
                   updatedTiers[smallestTierIndex].amount += Math.floor(newTotalInBase); // Add remaining base units
               } else {
                    console.warn("Smallest currency tier valueInBaseTier is not 1, cannot distribute remainder accurately.");
               }
          }
          return { ...prevSettings, playerCurrencyTiers: updatedTiers };
      });
  }, []);

  const handleCombatUpdates = React.useCallback((combatUpdates: CombatUpdatesSchema) => {
      const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

      setCharacters(prevChars => {
          if (!adventureSettings.rpgMode) {
               console.warn("handleCombatUpdates called when RPG mode is disabled.");
               return prevChars;
          }
          return prevChars.map(char => {
              const combatantUpdate = combatUpdates.updatedCombatants.find(cu => cu.combatantId === char.id);
              if (combatantUpdate) {
                  return {
                      ...char,
                      hitPoints: combatantUpdate.newHp,
                      manaPoints: combatantUpdate.newMp ?? char.manaPoints,
                      isHostile: combatantUpdate.isDefeated ? char.isHostile : true, // Keep hostility unless defeated? Or AI decides?
                      statusEffects: combatantUpdate.newStatusEffects || char.statusEffects, // Update status effects
                  };
              }
              return char;
          });
      });

      setAdventureSettings(prevSettings => {
          if (!prevSettings.rpgMode) return prevSettings;
          let newSettings = { ...prevSettings };

          const playerCombatUpdate = combatUpdates.updatedCombatants.find(cu => cu.combatantId === PLAYER_ID);
          if (playerCombatUpdate) {
              newSettings.playerCurrentHp = playerCombatUpdate.newHp;
              newSettings.playerCurrentMp = playerCombatUpdate.newMp ?? newSettings.playerCurrentMp;
              // TODO: Handle player status effects from playerCombatUpdate.newStatusEffects
              if (playerCombatUpdate.isDefeated) {
                  toastsToShow.push({ title: "Joueur Vaincu!", description: "L'aventure pourrait prendre un tournant difficile...", variant: "destructive" });
              }
          }

          // Regenerate 1 MP per turn if maxMP > 0 and currentMP < maxMP
          if (newSettings.playerMaxMp && (newSettings.playerMaxMp > 0) && newSettings.playerCurrentMp !== undefined && (newSettings.playerCurrentMp < newSettings.playerMaxMp)) {
               newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp ?? 0) + 1);
          }

          if (combatUpdates.expGained && combatUpdates.expGained > 0 && newSettings.playerCurrentExp !== undefined && newSettings.playerExpToNextLevel !== undefined && newSettings.playerLevel !== undefined) {
              newSettings.playerCurrentExp += combatUpdates.expGained;
              toastsToShow.push({ title: "Expérience Gagnée!", description: `Vous avez gagné ${combatUpdates.expGained} EXP.` });

              // Level up logic
              if (newSettings.playerCurrentExp >= newSettings.playerExpToNextLevel) {
                  newSettings.playerLevel += 1;
                  newSettings.playerCurrentExp -= newSettings.playerExpToNextLevel; // Carry over excess EXP
                  newSettings.playerExpToNextLevel = Math.floor(newSettings.playerExpToNextLevel * 1.5); // Increase EXP for next level
                  // Improve stats on level up (example: +5 max HP, +2 max MP if applicable)
                  newSettings.playerMaxHp = (newSettings.playerMaxHp || 0) + Math.floor(Math.random() * 6) + 2; // d6 + 2
                  newSettings.playerCurrentHp = newSettings.playerMaxHp; // Full heal on level up
                  if (newSettings.playerMaxMp && newSettings.playerMaxMp > 0) {
                      newSettings.playerMaxMp = (newSettings.playerMaxMp || 0) + Math.floor(Math.random() * 4) + 1; // d4 + 1
                      newSettings.playerCurrentMp = newSettings.playerMaxMp; // Full MP on level up
                  }
                  toastsToShow.push({ title: "Niveau Supérieur!", description: `Vous avez atteint le niveau ${newSettings.playerLevel}! Vos PV et PM max ont augmenté.`, variant: "default" });
              }
          }
          return newSettings;
      });

      if (combatUpdates.nextActiveCombatState) {
           setActiveCombat(combatUpdates.nextActiveCombatState);
      } else if (combatUpdates.combatEnded) {
           setActiveCombat(undefined);
          toastsToShow.push({ title: "Combat Terminé!"});
      }

      setTimeout(() => { // Ensure toasts appear after state updates
          toastsToShow.forEach(toastArgs => toast(toastArgs));
      },0);

  }, [toast, adventureSettings.rpgMode]);


  const handleNewCharacters = React.useCallback((newChars: Array<NewCharacterSchema>) => {
        if (!newChars || newChars.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        let addedCharacterNames: string[] = [];

        setStagedCharacters(prevStagedChars => {
            const currentLiveCharNames = new Set(characters.map(c => c.name.toLowerCase()));
            const currentStagedCharNamesFromPrev = new Set(prevStagedChars.map(c => c.name.toLowerCase()));
            const charsToAdd: Character[] = [];
            let existingStagedCharsCopy = JSON.parse(JSON.stringify(prevStagedChars));

            newChars.forEach(newCharData => {
                if (!currentLiveCharNames.has(newCharData.name.toLowerCase()) && !currentStagedCharNamesFromPrev.has(newCharData.name.toLowerCase())) {
                    const newId = `${newCharData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    const processedRelations: Record<string, string> = {};

                    if (stagedAdventureSettings.relationsMode && newCharData.initialRelations && Array.isArray(newCharData.initialRelations)) {
                        newCharData.initialRelations.forEach(rel => {
                            const relationDescription = rel.description || defaultRelationDesc;
                            if (rel.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                                processedRelations[PLAYER_ID] = relationDescription;
                            } else {
                                const targetChar = existingStagedCharsCopy.find((ec: Character) => ec.name.toLowerCase() === rel.targetName.toLowerCase()) || charsToAdd.find(addedChar => addedChar.name.toLowerCase() === rel.targetName.toLowerCase());
                                if (targetChar) {
                                    processedRelations[targetChar.id] = relationDescription;
                                }
                            }
                        });
                    }

                    if (stagedAdventureSettings.relationsMode) {
                        if (!processedRelations[PLAYER_ID] || processedRelations[PLAYER_ID].trim() === "" || processedRelations[PLAYER_ID].toLowerCase() === "inconnu" || processedRelations[PLAYER_ID].toLowerCase() === "unknown") {
                            processedRelations[PLAYER_ID] = defaultRelationDesc;
                        }
                        existingStagedCharsCopy.forEach((ec: Character) => {
                            if (!processedRelations[ec.id] || processedRelations[ec.id].trim() === "" || processedRelations[ec.id].toLowerCase() === "inconnu" || processedRelations[ec.id].toLowerCase() === "unknown") {
                                 processedRelations[ec.id] = defaultRelationDesc;
                            }
                             if (!ec.relations) ec.relations = {};
                             if(!ec.relations[newId] || ec.relations[newId].trim() === "" || ec.relations[newId].toLowerCase() === "inconnu" || ec.relations[newId].toLowerCase() === "unknown") {
                                ec.relations[newId] = defaultRelationDesc;
                             }
                        });
                    }

                    const processedInventory: Record<string, number> = {};
                    if (stagedAdventureSettings.rpgMode && newCharData.inventory && Array.isArray(newCharData.inventory)) {
                        newCharData.inventory.forEach(item => {
                            if (item.itemName && typeof item.itemName === 'string' && typeof item.quantity === 'number' && item.quantity > 0) {
                                processedInventory[item.itemName] = (processedInventory[item.itemName] || 0) + item.quantity;
                            }
                        });
                    }

                    const characterToAdd: Character = {
                        id: newId, name: newCharData.name,
                        details: newCharData.details || (currentLanguage === 'fr' ? "Rencontré récemment." : "Recently met."),
                        biographyNotes: newCharData.biographyNotes,
                        history: newCharData.initialHistoryEntry ? [newCharData.initialHistoryEntry] : [`Rencontré le ${new Date().toLocaleString()}`],
                        opinion: {}, portraitUrl: null,
                        affinity: stagedAdventureSettings.relationsMode ? 50 : undefined,
                        relations: stagedAdventureSettings.relationsMode ? processedRelations : undefined,
                        isHostile: stagedAdventureSettings.rpgMode ? newCharData.isHostile : undefined,
                        inventory: stagedAdventureSettings.rpgMode ? processedInventory : undefined,
                        ...(stagedAdventureSettings.rpgMode && {
                            level: newCharData.level ?? 1,
                            experience: 0,
                            characterClass: newCharData.characterClass ?? '',
                            stats: {}, skills: {},
                            spells: [], techniques: [], passiveAbilities: [], strength: 10, dexterity: 10,
                            intelligence: 10, wisdom: 10, charisma: 10, constitution: 10,
                            baseHitPoints: newCharData.maxHitPoints ?? 10,
                            hitPoints: newCharData.hitPoints ?? newCharData.maxHitPoints ?? 10,
                            maxHitPoints: newCharData.maxHitPoints ?? 10,
                            manaPoints: newCharData.manaPoints ?? newCharData.maxManaPoints ?? 0,
                            maxManaPoints: newCharData.maxManaPoints ?? 0,
                            armorClass: newCharData.armorClass ?? 10,
                            attackBonus: newCharData.attackBonus ?? 0,
                            damageBonus: newCharData.damageBonus ?? "1",
                        })
                    };
                    charsToAdd.push(characterToAdd);
                    addedCharacterNames.push(characterToAdd.name);
                    currentStagedCharNamesFromPrev.add(newCharData.name.toLowerCase());

                    if(stagedAdventureSettings.relationsMode) {
                        existingStagedCharsCopy = existingStagedCharsCopy.map((ec: Character) => ({
                            ...ec,
                            relations: {
                                ...(ec.relations || {}),
                                [newId]: ec.relations?.[newId] || defaultRelationDesc,
                            }
                        }));
                    }
                }
            });

            if (charsToAdd.length > 0) return [...existingStagedCharsCopy, ...charsToAdd];
            return prevStagedChars;
        });

        if (addedCharacterNames.length > 0) {
             setTimeout(() => {
                  toast({
                      title: "Nouveau Personnage Rencontré",
                      description: `${addedCharacterNames.join(', ')} a été ajouté aux modifications en attente. N'oubliez pas d'enregistrer les modifications pour appliquer.`,
                  });
              },0);
        }
    }, [currentLanguage, stagedAdventureSettings.playerName, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, toast, characters]);

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
                        history: [...(char.history || []), ...newHistory].slice(-20), // Keep last 20 history entries
                    };
                }
                return char;
            });
            if (changed) return updatedChars;
            return prevChars;
        });
    }, []);

    const handleAffinityUpdates = React.useCallback((updates: AffinityUpdateSchema[]) => {
        if (!stagedAdventureSettings.relationsMode || !updates || updates.length === 0) return;

        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setStagedCharacters(prevChars => {
             let changed = false;
            const updatedChars = prevChars.map(char => {
                const affinityUpdate = updates.find(u => u.characterName.toLowerCase() === char.name.toLowerCase());
                if (affinityUpdate) {
                    changed = true;
                    const currentAffinity = char.affinity ?? 50;
                    const newAffinity = Math.max(0, Math.min(100, currentAffinity + affinityUpdate.change));

                    if (Math.abs(affinityUpdate.change) >= 3) { // Only toast for significant changes
                         const charName = affinityUpdate.characterName;
                         const direction = affinityUpdate.change > 0 ? 'améliorée' : 'détériorée';
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

        setTimeout(() => {
            toastsToShow.forEach(toastArgs => toast(toastArgs));
        },0);
    }, [toast, stagedAdventureSettings.relationsMode]);

     const handleRelationUpdate = React.useCallback((charId: string, targetId: string, newRelation: string) => {
        if (!stagedAdventureSettings.relationsMode) return;
        setStagedCharacters(prevChars => prevChars.map(char => {
            if (char.id === charId) {
                const updatedRelations = { ...(char.relations || {}), [targetId]: newRelation };
                return { ...char, relations: updatedRelations };
            }
            return char;
        }));
    }, [stagedAdventureSettings.relationsMode]);

    const handleRelationUpdatesFromAI = React.useCallback((updates: RelationUpdateSchema[]) => {
        if (!stagedAdventureSettings.relationsMode || !updates || updates.length === 0) return;

        const defaultRelationDesc = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
        const toastsToShow: Array<Parameters<typeof toast>[0]> = [];

        setStagedCharacters(prevChars => {
            let charsCopy = JSON.parse(JSON.stringify(prevChars));
            let changed = false;

            updates.forEach(update => {
                const sourceCharIndex = charsCopy.findIndex((c: Character) => c.name.toLowerCase() === update.characterName.toLowerCase());
                if (sourceCharIndex === -1) return;

                let targetId: string | null = null;
                if (update.targetName.toLowerCase() === (stagedAdventureSettings.playerName || "Player").toLowerCase()) {
                    targetId = PLAYER_ID;
                } else {
                    const targetChar = charsCopy.find((c:Character) => c.name.toLowerCase() === update.targetName.toLowerCase());
                    if (targetChar) targetId = targetChar.id;
                    else return; // Target NPC not found in current staged characters
                }
                if (!targetId) return;

                const currentRelation = charsCopy[sourceCharIndex].relations?.[targetId] || defaultRelationDesc;
                const newRelationFromAI = update.newRelation.trim() === "" || update.newRelation.toLowerCase() === "inconnu" || update.newRelation.toLowerCase() === "unknown" ? defaultRelationDesc : update.newRelation;

                if (currentRelation !== newRelationFromAI) {
                    if (!charsCopy[sourceCharIndex].relations) {
                        charsCopy[sourceCharIndex].relations = {};
                    }
                    charsCopy[sourceCharIndex].relations[targetId] = newRelationFromAI;
                    changed = true;
                    toastsToShow.push({
                        title: `Relation Changée: ${update.characterName}`,
                        description: `Relation envers ${update.targetName} est maintenant "${newRelationFromAI}". Raison: ${update.reason || 'Événement narratif'}`,
                    });
                }
            });
            if (changed) return charsCopy;
            return prevChars;
        });

         setTimeout(() => { // Ensure toasts appear after state updates
            toastsToShow.forEach(toastArgs => toast(toastArgs));
        },0);
    }, [currentLanguage, stagedAdventureSettings.playerName, toast, stagedAdventureSettings.relationsMode]);


   const callGenerateAdventure = React.useCallback(async (input: GenerateAdventureInput) => {
    React.startTransition(() => {
      setIsLoading(true);
    });
    try {
        const result = await generateAdventure(input);
        React.startTransition(() => {
            handleNarrativeUpdate(result.narrative, 'ai', result.sceneDescriptionForImage, result.itemsObtained);

            if (result.newCharacters) handleNewCharacters(result.newCharacters);
            if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
            if (adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
            if (adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);

            if (adventureSettings.rpgMode && result.combatUpdates) {
                handleCombatUpdates(result.combatUpdates);
            }
            if (adventureSettings.rpgMode && result.currencyGained && result.currencyGained > 0 && adventureSettings.playerCurrencyTiers) {
                addCurrencyToPlayer(result.currencyGained);
                 setTimeout(() => { // Ensure toast appears after state updates
                    toast({ title: "Monnaie Obtenue!", description: `Vous avez obtenu de la monnaie.`});
                },0);
            }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Error in callGenerateAdventure: ", errorMessage, error); // Enhanced logging
        let toastDescription = `L'IA n'a pas pu générer de réponse: ${errorMessage}`;

        if (errorMessage.includes("503 Service Unavailable") || errorMessage.toLowerCase().includes("model is overloaded")) {
            toastDescription = "Le modèle d'IA est actuellement surchargé. Veuillez réessayer dans quelques instants.";
        } else if (errorMessage.toLowerCase().includes("api key not valid")) {
            toastDescription = "La clé API configurée pour Google AI n'est pas valide. Veuillez vérifier vos paramètres.";
        }

        setTimeout(() => { // Ensure toast appears after state updates
             toast({ title: "Erreur de l'IA", description: toastDescription, variant: "destructive" });
        },0);
    } finally {
         React.startTransition(() => {
           setIsLoading(false);
        });
    }
  }, [
      adventureSettings,
      handleNarrativeUpdate,
      handleNewCharacters,
      handleCharacterHistoryUpdate,
      handleAffinityUpdates,
      handleRelationUpdatesFromAI,
      handleCombatUpdates,
      addCurrencyToPlayer,
      toast
  ]);

  const handlePlayerItemAction = React.useCallback((itemName: string, action: 'use' | 'discard') => {
    React.startTransition(() => {
        if (!adventureSettings.rpgMode) {
            setTimeout(() => {toast({ title: "Mode RPG Désactivé", description: "L'inventaire et l'utilisation d'objets sont désactivés.", variant: "default" });},0);
            return;
        }

        let itemUsedOrDiscarded = false;
        let narrativeAction = "";
        let hpGain = 0;
        let mpGain = 0;
        let effectAppliedMessage = "";

        setAdventureSettings(prevSettings => {
            let newInventory = [...(prevSettings.playerInventory || [])];
            const itemIndex = newInventory.findIndex(invItem => invItem.name === itemName && invItem.quantity > 0);

            if (itemIndex === -1) {
                setTimeout(() => {toast({ title: "Objet Introuvable", description: `Vous n'avez pas de "${itemName}" utilisable ou en quantité suffisante.`, variant: "destructive" });},0);
                return prevSettings;
            }

            const item = { ...newInventory[itemIndex] };
            itemUsedOrDiscarded = true;
            let newSettings = { ...prevSettings };

            if (action === 'use') {
                narrativeAction = `J'utilise ${item.name}.`;
                if (item.type === 'consumable') {
                    // Apply effect only if NOT in active combat (combat effects are handled by AI response)
                    if (!activeCombat || !activeCombat.isActive) {
                        if (item.effect?.toLowerCase().includes("restaure") && item.effect?.toLowerCase().includes("pv")) {
                            const match = item.effect.match(/(\d+)\s*PV/i);
                            if (match && match[1]) hpGain = parseInt(match[1], 10);
                        }
                        if (item.effect?.toLowerCase().includes("restaure") && item.effect?.toLowerCase().includes("pm")) {
                            const match = item.effect.match(/(\d+)\s*PM/i);
                            if (match && match[1]) mpGain = parseInt(match[1], 10);
                        }

                        if (hpGain > 0 && newSettings.playerCurrentHp !== undefined && newSettings.playerMaxHp !== undefined) {
                            newSettings.playerCurrentHp = Math.min(newSettings.playerMaxHp, (newSettings.playerCurrentHp || 0) + hpGain);
                        }
                        if (mpGain > 0 && newSettings.playerCurrentMp !== undefined && newSettings.playerMaxMp !== undefined && newSettings.playerMaxMp > 0) {
                            newSettings.playerCurrentMp = Math.min(newSettings.playerMaxMp, (newSettings.playerCurrentMp || 0) + mpGain);
                        }
                    }
                    effectAppliedMessage = `${item.name} utilisé.`;
                    newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
                    if (newInventory[itemIndex].quantity <= 0) {
                        newInventory.splice(itemIndex, 1);
                    }
                } else {
                    setTimeout(() => {toast({ title: "Action non prise en charge", description: `Vous ne pouvez pas "utiliser" ${item.name} de cette manière directement. Décrivez votre action si vous souhaitez l'équiper ou l'utiliser autrement.`, variant: "default" });},0);
                    itemUsedOrDiscarded = false; // Reset flag as item wasn't actually used
                    return prevSettings; // Return previous settings if action not supported
                }
            } else if (action === 'discard') {
                narrativeAction = `Je jette ${item.name}.`;
                newInventory[itemIndex] = { ...item, quantity: item.quantity - 1 };
                if (newInventory[itemIndex].quantity <= 0) {
                    newInventory.splice(itemIndex, 1);
                }
                effectAppliedMessage = `${item.name} a été jeté.`;
            }
            newSettings.playerInventory = newInventory;
            return newSettings;
        });

        if (itemUsedOrDiscarded && narrativeAction) {
            if(effectAppliedMessage) { // Display toast for the action
                 setTimeout(() => { toast({ title: "Action d'Objet", description: effectAppliedMessage }); },0);
            }
            handleNarrativeUpdate(narrativeAction, 'user');

            // Get the most recent state for the AI call
            const currentSettingsSnapshot = JSON.parse(JSON.stringify(adventureSettings));
            const currentCharactersSnapshot = JSON.parse(JSON.stringify(characters));
            const currentNarrativeSnapshot = narrativeMessages.slice(-5).map(msg => msg.type === 'user' ? `> ${currentSettingsSnapshot.playerName || 'Player'}: ${msg.content}` : msg.content).join('\n\n') + `\n> ${currentSettingsSnapshot.playerName || 'Player'}: ${narrativeAction}`;
            const currentActiveCombatSnapshot = JSON.parse(JSON.stringify(activeCombat));


            const inputForAI: GenerateAdventureInput = {
                world: currentSettingsSnapshot.world,
                initialSituation: currentNarrativeSnapshot, // Use the latest narrative context
                characters: currentCharactersSnapshot,
                userAction: narrativeAction,
                currentLanguage: currentLanguage,
                playerName: currentSettingsSnapshot.playerName || "Player",
                rpgModeActive: currentSettingsSnapshot.rpgMode,
                relationsModeActive: currentSettingsSnapshot.relationsMode ?? true,
                activeCombat: currentActiveCombatSnapshot,
                currencyLabel: currentSettingsSnapshot.currencyLabel,
                playerCurrencyTiers: currentSettingsSnapshot.playerCurrencyTiers,
                playerClass: currentSettingsSnapshot.playerClass,
                playerLevel: currentSettingsSnapshot.playerLevel,
                playerCurrentHp: currentSettingsSnapshot.playerCurrentHp,
                playerMaxHp: currentSettingsSnapshot.playerMaxHp,
                playerCurrentMp: currentSettingsSnapshot.playerCurrentMp,
                playerMaxMp: currentSettingsSnapshot.playerMaxMp,
                playerCurrentExp: currentSettingsSnapshot.playerCurrentExp,
                playerExpToNextLevel: currentSettingsSnapshot.playerExpToNextLevel,
            };
            callGenerateAdventure(inputForAI);
        }
    });
  }, [adventureSettings, characters, currentLanguage, narrativeMessages, activeCombat, callGenerateAdventure, handleNarrativeUpdate, toast]);


    const handleTakeLoot = React.useCallback((messageId: string, itemsToTake: LootedItemSchema[]) => {
        setAdventureSettings(prevSettings => {
            if (!prevSettings.rpgMode) return prevSettings;

            const newInventory = [...(prevSettings.playerInventory || [])];
            itemsToTake.forEach(item => {
                const existingItemIndex = newInventory.findIndex(invItem => invItem.name === item.itemName);
                if (existingItemIndex > -1) {
                    newInventory[existingItemIndex].quantity += item.quantity;
                } else {
                    newInventory.push({
                        name: item.itemName,
                        quantity: item.quantity,
                        description: item.description,
                        effect: item.effect,
                        type: item.itemType,
                    });
                }
            });
            return { ...prevSettings, playerInventory: newInventory };
        });

        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
         setTimeout(() => {toast({ title: "Objets Ramassés", description: "Les objets ont été ajoutés à votre inventaire." });},0);
    }, [toast, adventureSettings.rpgMode]);

    const handleDiscardLoot = React.useCallback((messageId: string) => {
        setNarrativeMessages(prevMessages =>
            prevMessages.map(msg =>
                msg.id === messageId ? { ...msg, lootTaken: true } : msg
            )
        );
         setTimeout(() => {toast({ title: "Objets Laissés", description: "Vous avez décidé de ne pas prendre ces objets." });},0);
    }, [toast]);


   const handleEditMessage = React.useCallback((messageId: string, newContent: string) => {
       setNarrativeMessages(prev => prev.map(msg =>
           msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
       ));
        setTimeout(() => { // Ensure toast appears after state updates
            toast({ title: "Message Modifié" });
        },0);
   }, [toast]);

    const handleUndoLastMessage = React.useCallback(() => {
        let messageForToast: Parameters<typeof toast>[0] | null = null;
        let newActiveCombatState = activeCombat;

        React.startTransition(() => {
            setNarrativeMessages(prevNarrative => {
                if (prevNarrative.length <= 1 && prevNarrative[0]?.type === 'system') {
                     messageForToast = { title: "Impossible d'annuler", description: "Aucun message à annuler après l'introduction.", variant: "destructive" };
                     return prevNarrative;
                }

                // More complex logic might be needed to perfectly restore combat state
                if (activeCombat?.isActive) {
                    // This is a simplification; true combat state restoration would require saving previous states
                    console.warn("Undo in combat: Combat state might not be perfectly restored by simple message removal.");
                    // Potentially, we could try to find the last `activeCombat` state from narrative messages if stored, or reset combat.
                }

                // Find the last user message and remove it and all subsequent AI responses
                let lastUserIndex = -1;
                for (let i = prevNarrative.length - 1; i >= 0; i--) {
                    if (prevNarrative[i].type === 'user') {
                        lastUserIndex = i;
                        break;
                    }
                }

                if (lastUserIndex !== -1) {
                    const newNarrative = prevNarrative.slice(0, lastUserIndex);
                    messageForToast = { title: "Dernier tour annulé" };

                    // Check if the message *before* the undone user message initiated combat
                    const lastAiMessageBeforeUndo = prevNarrative[lastUserIndex -1];
                    if (lastAiMessageBeforeUndo?.sceneDescription?.toLowerCase().includes("combat started") || lastAiMessageBeforeUndo?.content.toLowerCase().includes("combat commence")) {
                        newActiveCombatState = undefined; // Reset combat state if the undone action was the one that started it
                    }
                    return newNarrative;
                } else if (prevNarrative.length > 1 && prevNarrative[0]?.type === 'system') {
                     // If no user message found, but there are AI messages after system, remove the last AI message
                     const newNarrative = prevNarrative.slice(0, -1);
                     messageForToast = { title: "Dernier message IA annulé" };
                     return newNarrative;
                }


                messageForToast = { title: "Annulation non applicable", description:"Aucune action utilisateur claire à annuler ou déjà à l'état initial."};
                return prevNarrative;
            });
            setActiveCombat(newActiveCombatState); // Update combat state if it was changed
        });

        if (messageForToast) {
            setTimeout(() => { // Ensure toast appears after state updates
                toast(messageForToast as Parameters<typeof toast>[0]);
            },0);
        }
    }, [activeCombat, toast]);

    const handleRegenerateLastResponse = React.useCallback(async () => {
         if (isRegenerating) return;

         let lastAiMessage: Message | undefined;
         let lastUserAction: string | undefined;
         let contextMessages: Message[] = [];
         let lastAiIndex = -1;

         const currentNarrative = [...narrativeMessages]; // Work with a copy

         // Find the last AI message and the user action that preceded it
         for (let i = currentNarrative.length - 1; i >= 0; i--) {
             const message = currentNarrative[i];
             if (message.type === 'ai' && !lastAiMessage) {
                 lastAiMessage = message;
                 lastAiIndex = i;
             } else if (message.type === 'user' && lastAiMessage) { // Ensure we found an AI message first
                 lastUserAction = message.content;
                 // Take the user message and up to 4 previous messages for context
                 const contextEndIndex = i;
                 contextMessages = currentNarrative.slice(Math.max(0, contextEndIndex - 4), contextEndIndex + 1);
                 break;
             }
         }

         if (!lastAiMessage || !lastUserAction) {
            setTimeout(() => { // Ensure toast appears after state updates
                toast({ title: "Impossible de régénérer", description: "Aucune réponse IA précédente valide trouvée pour régénérer.", variant: "destructive" });
            },0);
             return;
         }
         React.startTransition(() => {
           setIsRegenerating(true);
         });
         setTimeout(() => { toast({ title: "Régénération en cours...", description: "Génération d'une nouvelle réponse." }); },0);

         // Construct the context for regeneration
         const narrativeContextForRegen = contextMessages
             .map(msg =>
                 msg.type === 'user' ? `> ${adventureSettings.playerName || 'Player'}: ${msg.content}` : msg.content
             ).join('\n\n'); // Ensure the user action is part of this

         try {
             const input: GenerateAdventureInput = {
                 world: adventureSettings.world,
                 initialSituation: narrativeContextForRegen,
                 characters: characters,
                 userAction: lastUserAction, // This is the action that led to the AI response we're regenerating
                 currentLanguage: currentLanguage,
                 playerName: adventureSettings.playerName || "Player",
                 relationsModeActive: adventureSettings.relationsMode ?? true,
                 rpgModeActive: adventureSettings.rpgMode ?? false,
                 activeCombat: activeCombat, // Pass the current combat state
                 currencyLabel: adventureSettings.currencyLabel,
                 playerCurrencyTiers: adventureSettings.playerCurrencyTiers,
                 playerClass: adventureSettings.playerClass,
                 playerLevel: adventureSettings.playerLevel,
                 playerCurrentHp: adventureSettings.playerCurrentHp,
                 playerMaxHp: adventureSettings.playerMaxHp,
                 playerCurrentMp: adventureSettings.playerCurrentMp,
                 playerMaxMp: adventureSettings.playerMaxMp,
                 playerCurrentExp: adventureSettings.playerCurrentExp,
                 playerExpToNextLevel: adventureSettings.playerExpToNextLevel,
             };

             const result = await generateAdventure(input);

            React.startTransition(() => {
                setNarrativeMessages(prev => {
                    const newNarrative = [...prev];
                    const newAiMessage: Message = {
                        id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        type: 'ai',
                        content: result.narrative,
                        timestamp: Date.now(),
                        sceneDescription: result.sceneDescriptionForImage,
                        loot: result.itemsObtained,
                        lootTaken: false,
                    };
                    if (lastAiIndex !== -1) {
                        newNarrative.splice(lastAiIndex, 1, newAiMessage); // Replace the old AI message
                    } else {
                        // Should not happen if lastAiMessage was found, but as a fallback:
                        newNarrative.push(newAiMessage);
                    }
                    return newNarrative;
                });

                // Handle side effects of the new AI response
                if (result.newCharacters) handleNewCharacters(result.newCharacters);
                if (result.characterUpdates) handleCharacterHistoryUpdate(result.characterUpdates);
                if(adventureSettings.relationsMode && result.affinityUpdates) handleAffinityUpdates(result.affinityUpdates);
                if(adventureSettings.relationsMode && result.relationUpdates) handleRelationUpdatesFromAI(result.relationUpdates);
                if(adventureSettings.rpgMode && result.combatUpdates) {
                    handleCombatUpdates(result.combatUpdates);
                }
                 if (adventureSettings.rpgMode && result.currencyGained && result.currencyGained > 0 && adventureSettings.playerCurrencyTiers) {
                    addCurrencyToPlayer(result.currencyGained);
                }
                setTimeout(() => {toast({ title: "Réponse Régénérée", description: "Une nouvelle réponse a été ajoutée." });},0);
            });

         } catch (error) {
             console.error("Error regenerating adventure:", error);
             let toastDescription = `Impossible de générer une nouvelle réponse: ${error instanceof Error ? error.message : 'Unknown error'}.`;
             if (error instanceof Error && (error.message.includes("503") || error.message.toLowerCase().includes("overloaded"))) {
                 toastDescription = "Le modèle d'IA est surchargé. Veuillez réessayer plus tard.";
             }
             setTimeout(() => { // Ensure toast appears after state updates
                toast({ title: "Erreur de Régénération", description: toastDescription, variant: "destructive"});
              },0);
         } finally {
             React.startTransition(() => {
                setIsRegenerating(false);
             });
         }
     }, [isRegenerating, narrativeMessages, adventureSettings, characters, currentLanguage, toast, handleNewCharacters, handleCharacterHistoryUpdate, handleAffinityUpdates, handleRelationUpdatesFromAI, activeCombat, handleCombatUpdates, addCurrencyToPlayer, callGenerateAdventure]);


   const handleCharacterUpdate = React.useCallback((updatedCharacter: Character) => {
       setStagedCharacters(prev => prev.map(c => c.id === updatedCharacter.id ? updatedCharacter : c));
   }, []);

    const handleSaveNewCharacter = React.useCallback((character: Character) => {
        // This function now only saves to localStorage.
        // The character should already be in `stagedCharacters` when this is called.
        if (typeof window !== 'undefined') {
            try {
                const existingCharsStr = localStorage.getItem('globalCharacters');
                let existingChars: Character[] = existingCharsStr ? JSON.parse(existingCharsStr) : [];

                const charIndex = existingChars.findIndex(c => c.id === character.id || c.name.toLowerCase() === character.name.toLowerCase());

                if (charIndex > -1) {
                    // Update existing global character
                    existingChars[charIndex] = { ...character, _lastSaved: Date.now() };
                } else {
                    // Add new global character
                    existingChars.push({ ...character, _lastSaved: Date.now() });
                }
                localStorage.setItem('globalCharacters', JSON.stringify(existingChars));
                setTimeout(() => { // Ensure toast appears after state updates
                    toast({ title: "Personnage Sauvegardé Globalement", description: `${character.name} est maintenant disponible pour d'autres aventures et pour le chat.` });
                 },0);
                // Update the _lastSaved timestamp in stagedCharacters to reflect the save
                setStagedCharacters(prev => prev.map(c => c.id === character.id ? { ...c, _lastSaved: Date.now() } : c));

            } catch (error) {
                 console.error("Failed to save character to localStorage:", error);
                 setTimeout(() => { toast({ title: "Erreur de Sauvegarde Globale", description: "Impossible de sauvegarder le personnage globalement.", variant: "destructive" }); },0);
            }
        } else {
             setTimeout(() => { // Ensure toast appears after state updates
                toast({ title: "Erreur", description: "La sauvegarde globale n'est disponible que côté client.", variant: "destructive" });
            },0);
        }
    }, [toast]);


    const handleAddStagedCharacter = React.useCallback((globalCharToAdd: Character) => {
        let characterWasAdded = false;
        let characterNameForToast = globalCharToAdd.name;

        setStagedCharacters(prevStagedChars => {
            if (prevStagedChars.some(sc => sc.id === globalCharToAdd.id || sc.name.toLowerCase() === globalCharToAdd.name.toLowerCase())) {
                characterWasAdded = false; // Character already in staged list
                return prevStagedChars;
            }

            characterWasAdded = true;
            const defaultRelation = currentLanguage === 'fr' ? "Inconnu" : "Unknown";
            const newChar = { ...globalCharToAdd }; // Create a new object copy

            // Adjust relations for the new character and existing characters
            if (stagedAdventureSettings.relationsMode) {
                newChar.relations = newChar.relations || {};
                // Relation to player
                if (!newChar.relations[PLAYER_ID]) {
                    newChar.relations[PLAYER_ID] = defaultRelation;
                }
                // Relations to other staged characters
                prevStagedChars.forEach(existingChar => {
                    if (!newChar.relations![existingChar.id]) {
                        newChar.relations![existingChar.id] = defaultRelation;
                    }
                });
            } else {
                newChar.relations = undefined;
                newChar.affinity = undefined; // No affinity if relations mode is off
            }

            // Ensure existing characters also have a relation to the new one
            const updatedPrevChars = prevStagedChars.map(existingChar => {
                if (stagedAdventureSettings.relationsMode) {
                    const updatedRelations = { ...(existingChar.relations || {}), [newChar.id]: defaultRelation };
                    return { ...existingChar, relations: updatedRelations };
                }
                return existingChar;
            });

            // Update RPG stats based on current adventure settings
            if (stagedAdventureSettings.rpgMode) {
                newChar.level = newChar.level ?? 1;
                newChar.experience = newChar.experience ?? 0;
                newChar.characterClass = newChar.characterClass ?? '';
                newChar.stats = newChar.stats ?? {};
                newChar.inventory = newChar.inventory ?? {};
                newChar.skills = newChar.skills ?? {};
                newChar.spells = newChar.spells ?? [];
                newChar.techniques = newChar.techniques ?? [];
                newChar.passiveAbilities = newChar.passiveAbilities ?? [];
                newChar.strength = newChar.strength ?? 10;
                newChar.dexterity = newChar.dexterity ?? 10;
                newChar.constitution = newChar.constitution ?? 10;
                newChar.intelligence = newChar.intelligence ?? 10;
                newChar.wisdom = newChar.wisdom ?? 10;
                newChar.charisma = newChar.charisma ?? 10;
                newChar.baseHitPoints = newChar.baseHitPoints ?? 10;
                newChar.hitPoints = newChar.hitPoints ?? newChar.maxHitPoints ?? 10;
                newChar.maxHitPoints = newChar.maxHitPoints ?? 10;
                newChar.manaPoints = newChar.manaPoints ?? newChar.maxManaPoints ?? 0;
                newChar.maxManaPoints = newChar.maxManaPoints ?? 0;
                newChar.armorClass = newChar.armorClass ?? 10;
                newChar.attackBonus = newChar.attackBonus ?? 0;
                newChar.damageBonus = newChar.damageBonus ?? "1";
                newChar.isHostile = newChar.isHostile ?? false;
            } else { // Clear RPG stats if RPG mode is off for the adventure
                delete newChar.level; delete newChar.experience; delete newChar.characterClass;
                delete newChar.stats; delete newChar.inventory; delete newChar.skills;
                delete newChar.spells; delete newChar.techniques; delete newChar.passiveAbilities;
                delete newChar.strength; delete newChar.dexterity; delete newChar.constitution;
                delete newChar.intelligence; delete newChar.wisdom; delete newChar.charisma;
                delete newChar.baseHitPoints; delete newChar.hitPoints; delete newChar.maxHitPoints;
                delete newChar.manaPoints; delete newChar.maxManaPoints;
                delete newChar.armorClass; delete newChar.attackBonus; delete newChar.damageBonus;
                delete newChar.isHostile;
            }
            return [...updatedPrevChars, newChar];
        });

        setTimeout(() => { // Ensure toast appears after state updates
            if (characterWasAdded) {
                toast({ title: "Personnage Ajouté à l'Aventure", description: `${characterNameForToast} a été ajouté aux modifications en attente pour cette aventure. N'oubliez pas d'enregistrer les modifications.` });
            } else {
                toast({ title: "Personnage déjà présent", description: `${characterNameForToast} est déjà dans l'aventure actuelle.`, variant: "default" });
            }
        },0);
    }, [currentLanguage, toast, stagedAdventureSettings.rpgMode, stagedAdventureSettings.relationsMode, stagedAdventureSettings.playerName]);


   const handleSave = React.useCallback(() => {
        // Ensure current staged changes are applied to live state before saving
        const charactersToSave = characters.map(({ ...char }) => char); // Use live characters
        const saveData: SaveData = {
            adventureSettings, // Use live adventure settings
            characters: charactersToSave,
            narrative: narrativeMessages,
            currentLanguage,
            activeCombat: activeCombat, // Save current combat state
            saveFormatVersion: 1.6, // Update if schema changes
            timestamp: new Date().toISOString(),
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
        URL.revokeObjectURL(url);
         setTimeout(() => { // Ensure toast appears after state updates
            toast({ title: "Aventure Sauvegardée", description: "Le fichier JSON a été téléchargé." });
        },0);
    }, [adventureSettings, characters, narrativeMessages, currentLanguage, activeCombat, toast]);

    const handleLoad = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target?.result as string;
                const loadedData: Partial<SaveData> = JSON.parse(jsonString);

                // Basic validation of loaded data structure
                if (!loadedData.adventureSettings || !loadedData.characters || !loadedData.narrative || !Array.isArray(loadedData.narrative)) {
                    throw new Error("Structure de fichier de sauvegarde invalide ou manquante.");
                }
                const isValidNarrative = loadedData.narrative.every(msg =>
                    typeof msg === 'object' && msg !== null && typeof msg.id === 'string' &&
                    ['user', 'ai', 'system'].includes(msg.type) && typeof msg.content === 'string' &&
                    typeof msg.timestamp === 'number'
                );
                if (!isValidNarrative) {
                    // Attempt to migrate old string narrative if necessary
                    if (typeof loadedData.narrative === 'string') {
                        loadedData.narrative = [{ id: `migrated-${Date.now()}`, type: 'system', content: loadedData.narrative as unknown as string, timestamp: Date.now() }];
                    } else throw new Error("Structure des messages narratifs invalide.");
                }

                 // Migration for older save formats
                 if (loadedData.saveFormatVersion === undefined || loadedData.saveFormatVersion < 1.4) {
                     // Migrate character structure (history, opinion, affinity, relations)
                     loadedData.characters = loadedData.characters.map(c => ({ ...c, history: Array.isArray(c.history) ? c.history : [], opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {}, affinity: c.affinity ?? 50, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                     loadedData.adventureSettings.playerName = loadedData.adventureSettings.playerName || "Player";
                 }
                 if (loadedData.saveFormatVersion < 1.5) { // Introduced relationsMode
                       loadedData.adventureSettings.relationsMode = loadedData.adventureSettings.relationsMode ?? true;
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: c.relations || { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                 }
                  if (loadedData.saveFormatVersion < 1.6) { // Relations became non-optional
                       loadedData.characters = loadedData.characters.map(c => ({ ...c, relations: typeof c.relations === 'object' && c.relations !== null ? c.relations : { [PLAYER_ID]: loadedData.currentLanguage === 'fr' ? "Inconnu" : "Unknown" }, }));
                       loadedData.adventureSettings.playerCurrencyTiers = loadedData.adventureSettings.playerCurrencyTiers || [];
                       loadedData.adventureSettings.currencyLabel = loadedData.adventureSettings.currencyLabel || baseAdventureSettings.currencyLabel; // Use a default if missing
                 }


                // Ensure all characters have RPG stats if RPG mode is active, or clear them if not
                const rpgModeActive = loadedData.adventureSettings.rpgMode;
                const relationsModeActive = loadedData.adventureSettings.relationsMode ?? true;
                const loadedLang = loadedData.currentLanguage || "fr";
                const defaultRelation = loadedLang === 'fr' ? "Inconnu" : "Unknown";

                const validatedCharacters = loadedData.characters.map((c: any) => { // Use any for c to handle older formats
                    const charId = c.id || `${c.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                    let relations = relationsModeActive && typeof c.relations === 'object' && c.relations !== null ? c.relations : (relationsModeActive ? { [PLAYER_ID]: defaultRelation } : undefined);
                    if (relationsModeActive && relations && !relations[PLAYER_ID]) relations[PLAYER_ID] = defaultRelation;

                    // Ensure relations with other loaded characters
                    if (relationsModeActive && relations && loadedData.characters) {
                        loadedData.characters.forEach(otherC => {
                            if (otherC.id !== charId && !relations![otherC.id]) {
                                relations![otherC.id] = defaultRelation;
                            }
                        });
                    }

                    return { // Construct character with all expected fields
                        id: charId,
                        name: c.name || "Inconnu",
                        details: c.details || "",
                        biographyNotes: c.biographyNotes,
                        history: Array.isArray(c.history) ? c.history : [],
                        opinion: typeof c.opinion === 'object' && c.opinion !== null ? c.opinion : {},
                        portraitUrl: c.portraitUrl || null,
                        affinity: relationsModeActive ? (c.affinity ?? 50) : undefined,
                        relations: relations,
                        _lastSaved: c._lastSaved, // Preserve if exists
                        // RPG Stats - ensure defaults or clear if RPG mode is off
                        ...(rpgModeActive ? {
                            level: c.level ?? 1, experience: c.experience ?? 0, characterClass: c.characterClass ?? '',
                            stats: typeof c.stats === 'object' && c.stats !== null ? c.stats : {},
                            inventory: typeof c.inventory === 'object' && c.inventory !== null ? c.inventory : {},
                            skills: typeof c.skills === 'object' && c.skills !== null ? c.skills : {},
                            spells: Array.isArray(c.spells) ? c.spells : [],
                            techniques: Array.isArray(c.techniques) ? c.techniques : [],
                            passiveAbilities: Array.isArray(c.passiveAbilities) ? c.passiveAbilities : [],
                            strength: c.strength ?? 10, dexterity: c.dexterity ?? 10, constitution: c.constitution ?? 10,
                            intelligence: c.intelligence ?? 10, wisdom: c.wisdom ?? 10, charisma: c.charisma ?? 10,
                            baseHitPoints: c.baseHitPoints ?? 10,
                            hitPoints: c.hitPoints ?? c.maxHitPoints ?? 10,
                            maxHitPoints: c.maxHitPoints ?? 10,
                            manaPoints: c.manaPoints ?? c.maxManaPoints ?? 0,
                            maxManaPoints: c.maxManaPoints ?? 0,
                            armorClass: c.armorClass ?? 10,
                            attackBonus: c.attackBonus ?? 0,
                            damageBonus: c.damageBonus ?? "1",
                            isHostile: c.isHostile ?? false,
                        } : {}),
                    }
                });

                const finalAdventureSettings: AdventureSettings = {
                    ...baseAdventureSettings, // Start with defaults
                    ...loadedData.adventureSettings, // Override with loaded
                    relationsMode: relationsModeActive,
                    rpgMode: rpgModeActive,
                    // Ensure player stats are consistent with RPG mode
                    playerCurrentHp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentHp ?? loadedData.adventureSettings.playerMaxHp) : undefined,
                    playerCurrentMp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentMp ?? loadedData.adventureSettings.playerMaxMp) : undefined,
                    playerCurrentExp: rpgModeActive ? (loadedData.adventureSettings.playerCurrentExp ?? 0) : undefined,
                    playerInventory: loadedData.adventureSettings.playerInventory || [],
                    playerCurrencyTiers: loadedData.adventureSettings.playerCurrencyTiers || [],
                    currencyLabel: loadedData.adventureSettings.currencyLabel || baseAdventureSettings.currencyLabel,
                };

                // Apply loaded data to base settings to trigger a full reset/reload
                setBaseAdventureSettings(JSON.parse(JSON.stringify(finalAdventureSettings)));
                setBaseCharacters(JSON.parse(JSON.stringify(validatedCharacters)));
                // These will be set by the useEffect that depends on baseAdventureSettings
                // setNarrativeMessages(loadedData.narrative as Message[]);
                // setCurrentLanguage(loadedLang);
                // setActiveCombat(loadedData.activeCombat || undefined);

                 setTimeout(() => { // Ensure toast appears after state updates
                    toast({ title: "Aventure Chargée", description: "L'état de l'aventure a été restauré." });
                },0);
            } catch (error: any) {
                console.error("Error loading adventure:", error);
                setTimeout(() => { // Ensure toast appears after state updates
                    toast({ title: "Erreur de Chargement", description: `Impossible de lire le fichier JSON: ${error.message}`, variant: "destructive" });
                },0);
            }
        };
        reader.readAsText(file);
        if(event.target) event.target.value = ''; // Reset file input to allow re-uploading same file
    }, [toast, baseAdventureSettings]); // Added baseAdventureSettings

    const confirmRestartAdventure = React.useCallback(() => {
        // Use the current base settings to restart
        const initialSettings = JSON.parse(JSON.stringify(baseAdventureSettings));
        const newLiveAdventureSettings = {
            ...initialSettings,
            playerCurrentHp: initialSettings.rpgMode ? initialSettings.playerMaxHp : undefined,
            playerCurrentMp: initialSettings.rpgMode ? initialSettings.playerMaxMp : undefined,
            playerCurrentExp: initialSettings.rpgMode ? 0 : undefined,
            playerInventory: initialSettings.playerInventory || [], // Reset inventory to what's in base settings
            playerCurrencyTiers: initialSettings.playerCurrencyTiers || [], // Reset currency
        };
        const newLiveCharacters = JSON.parse(JSON.stringify(baseCharacters));
        const newNarrative = [{ id: `msg-${Date.now()}`, type: 'system', content: initialSettings.initialSituation, timestamp: Date.now() }];

        setAdventureSettings(newLiveAdventureSettings);
        setCharacters(newLiveCharacters);
        setNarrativeMessages(newNarrative);
        setActiveCombat(undefined);

        // Update staged settings to match the new live state
        setStagedAdventureSettings(JSON.parse(JSON.stringify(newLiveAdventureSettings)));
        setStagedCharacters(JSON.parse(JSON.stringify(newLiveCharacters)));
        setFormPropKey(prev => prev + 1); // Trigger form reset

        setShowRestartConfirm(false);
        setTimeout(() => { // Ensure toast appears after state updates
            toast({ title: "Aventure Recommencée", description: "L'histoire a été réinitialisée." });
        },0);
    }, [baseAdventureSettings, baseCharacters, toast]);

  const onRestartAdventure = React.useCallback(() => {
    setShowRestartConfirm(true);
  }, [setShowRestartConfirm]);


  // Memoize the derived data for AdventureForm initialValues
  const memoizedFormCharacters = React.useMemo(() => {
    return stagedCharacters.map(c => ({ id: c.id, name: c.name, details: c.details }));
  }, [stagedCharacters]);

  const memoizedStagedAdventureSettingsForForm = React.useMemo<AdventureFormValues>(() => {
    // Convert playerCurrencyTiers (valueInBaseTier) to form's currencyTiers (valueInPreviousTier)
    const formTiers = stagedAdventureSettings.playerCurrencyTiers?.map((tier, index, arr) => {
        let valueInPrevious = tier.valueInBaseTier; // Default for the smallest unit or if only one tier
        if (index > 0) { // If not the smallest unit
            const previousTier = arr[index -1]; // Assumes tiers are sorted largest to smallest valueInBaseTier
            valueInPrevious = tier.valueInBaseTier / previousTier.valueInBaseTier;
        } else if (arr.length > 1 && index === 0) { // Largest unit, its value relative to the next smaller one
             valueInPrevious = tier.valueInBaseTier / (arr[1]?.valueInBaseTier || 1); // Avoid division by zero
        }
        // For the smallest unit, valueInPreviousTier can be considered 1 or its own valueInBaseTier (which should be 1)
        // The form needs to interpret this as "how many of the *previous smaller tier* make this one".

        return {
            name: tier.name,
            valueInPreviousTier: valueInPrevious,
            initialAmount: tier.amount
        };
    }) || [];


    return {
      world: stagedAdventureSettings.world,
      initialSituation: stagedAdventureSettings.initialSituation,
      playerName: stagedAdventureSettings.playerName,
      enableRpgMode: stagedAdventureSettings.rpgMode,
      enableRelationsMode: stagedAdventureSettings.relationsMode ?? true,
      characters: memoizedFormCharacters,
      currencyLabel: stagedAdventureSettings.currencyLabel,
      currencyTiers: formTiers, // Use the converted tiers for the form
      playerClass: stagedAdventureSettings.playerClass,
      playerLevel: stagedAdventureSettings.playerLevel,
      playerMaxHp: stagedAdventureSettings.playerMaxHp,
      playerMaxMp: stagedAdventureSettings.playerMaxMp,
      playerExpToNextLevel: stagedAdventureSettings.playerExpToNextLevel,
    };
  }, [stagedAdventureSettings, memoizedFormCharacters]);

    const callSuggestQuestHook = React.useCallback(async () => {
      React.startTransition(() => {
        setIsSuggestingQuest(true);
      });
        try {
            const recentMessages = narrativeMessages.slice(-3).map(m => m.content).join("\n");
            const characterNames = characters.map(c => c.name).join(", ");
            const input: SuggestQuestHookInput = {
                worldDescription: adventureSettings.world,
                currentSituation: recentMessages,
                involvedCharacters: characterNames,
                language: currentLanguage,
            };
            const result = await suggestQuestHook(input);
            setTimeout(() => { // Ensure toast appears after state updates
                toast({
                    title: "Suggestion d'Objectif",
                    description: `${result.questHook} (Raison: ${result.justification})`,
                    duration: 10000, // Show longer
                });
            },0);
        } catch (error) {
            console.error("Error suggesting quest hook:", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setTimeout(() => { // Ensure toast appears after state updates
              toast({ title: "Erreur de Suggestion", description: `Impossible de suggérer un objectif: ${errorMessage}`, variant: "destructive" });
            },0);
        } finally {
          React.startTransition(() => {
            setIsSuggestingQuest(false);
          });
        }
    }, [narrativeMessages, characters, adventureSettings.world, currentLanguage, toast]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        handleSettingsUpdate={handleSettingsUpdate}
        handleCharacterUpdate={handleCharacterUpdate}
        handleNewCharacters={handleNewCharacters}
        handleCharacterHistoryUpdate={handleCharacterHistoryUpdate}
        handleAffinityUpdates={handleAffinityUpdates}
        handleRelationUpdate={handleRelationUpdate}
        handleRelationUpdatesFromAI={handleRelationUpdatesFromAI}
        handleSaveNewCharacter={handleSaveNewCharacter}
        handleAddStagedCharacter={handleAddStagedCharacter}
        handleNarrativeUpdate={handleNarrativeUpdate}
        handleSave={handleSave}
        handleLoad={handleLoad}
        setCurrentLanguage={setCurrentLanguage}
        translateTextAction={translateText}
        generateAdventureAction={callGenerateAdventure}
        generateSceneImageAction={generateSceneImage}
        handleEditMessage={handleEditMessage}
        handleRegenerateLastResponse={handleRegenerateLastResponse}
        handleUndoLastMessage={handleUndoLastMessage}
        playerId={PLAYER_ID}
        playerName={adventureSettings.playerName || "Player"}
        onRestartAdventure={onRestartAdventure}
        activeCombat={activeCombat}
        onCombatUpdates={handleCombatUpdates}
        suggestQuestHookAction={callSuggestQuestHook}
        isSuggestingQuest={isSuggestingQuest}
        showRestartConfirm={showRestartConfirm}
        setShowRestartConfirm={setShowRestartConfirm}
        handleTakeLoot={handleTakeLoot}
        handleDiscardLoot={handleDiscardLoot}
        handlePlayerItemAction={handlePlayerItemAction}
      />
      </>
  );
}
