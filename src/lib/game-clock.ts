/**
 * @fileoverview Classe déterministe pour la gestion du temps de jeu.
 * Gère l'avancement du temps, le passage des jours, et fournit des formats
 * utiles pour l'affichage et l'envoi au LLM.
 *
 * Mode d'emploi :
 * 1. Créez une instance : `const clock = new GameClock({ day: 1, hour: 8, ... });`
 * 2. Faites avancer le temps : `clock.advanceTime("00:15");`
 * 3. Récupérez l'état : `const state = clock.getState();` // { day: 1, hour: 8, minute: 15, ... }
 * 4. Obtenez le tag pour le LLM : `const tag = clock.getTimeTag();` // "[time-event: matinée]"
 * 5. Sauvegardez/Chargez : `localStorage.setItem('clock', clock.serialize()); const clock = GameClock.deserialize(saved);`
 */

interface GameClockOptions {
    day?: number;
    hour?: number;
    minute?: number;
    dayNames?: string[];
}

export interface GameClockState {
    day: number;
    hour: number;
    minute: number;
    dayName: string;
}

export class GameClock {
    private day: number;
    private hour: number;
    private minute: number;
    private dayNames: string[];
    
    // Total des minutes écoulées depuis le début, pour une gestion simple des événements futurs
    private totalMinutesElapsed: number; 

    constructor(options: GameClockOptions = {}) {
        this.day = options.day ?? 1;
        this.hour = options.hour ?? 8;
        this.minute = options.minute ?? 0;
        this.dayNames = options.dayNames ?? ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
        
        this.totalMinutesElapsed = this.calculateTotalMinutes();
    }

    private calculateTotalMinutes(): number {
      const minutesInADay = 24 * 60;
      return ((this.day - 1) * minutesInADay) + (this.hour * 60) + this.minute;
    }

    /**
     * Parse une chaîne de temps "HH:MM", "MM", ou "H:MM" en un nombre total de minutes.
     * @param timeString La chaîne de temps à parser.
     * @returns Le nombre total de minutes.
     */
    private parseTimeToMinutes(timeString: string): number {
        if (!timeString || typeof timeString !== 'string') return 0;

        if (timeString.includes(':')) {
            const parts = timeString.split(':').map(Number);
            const hours = parts[0] || 0;
            const minutes = parts[1] || 0;
            return (hours * 60) + minutes;
        } else {
            const minutes = Number(timeString);
            return isNaN(minutes) ? 0 : minutes;
        }
    }

    /**
     * Avance le temps d'un nombre de minutes donné ou d'une chaîne "HH:MM".
     * @param timeToAdd Le temps à ajouter.
     */
    public advanceTime(timeToAdd: number | string): void {
        const minutesToAdd = typeof timeToAdd === 'number' ? timeToAdd : this.parseTimeToMinutes(timeToAdd);
        if (minutesToAdd <= 0) return;

        this.totalMinutesElapsed += minutesToAdd;
        
        const minutesInADay = 24 * 60;
        this.day = Math.floor(this.totalMinutesElapsed / minutesInADay) + 1;
        
        const minutesIntoCurrentDay = this.totalMinutesElapsed % minutesInADay;
        this.hour = Math.floor(minutesIntoCurrentDay / 60);
        this.minute = minutesIntoCurrentDay % 60;
    }

    /**
     * Définit manuellement l'heure et le jour.
     */
    public setTime({ day, hour, minute }: { day: number; hour: number; minute: number; }): void {
        this.day = day;
        this.hour = hour;
        this.minute = minute;
        this.totalMinutesElapsed = this.calculateTotalMinutes();
    }

    /**
     * Retourne l'état actuel de l'horloge.
     */
    public getState(): GameClockState {
        const dayIndex = (this.day - 1) % this.dayNames.length;
        const dayName = this.dayNames[dayIndex] || "Jour Inconnu";
        
        return {
            day: this.day,
            hour: this.hour,
            minute: this.minute,
            dayName: dayName,
        };
    }

    /**
     * Retourne un tag temporel court pour le LLM.
     */
    public getTimeTag(): string {
        if (this.hour >= 5 && this.hour < 12) return "[time-event: matinée]";
        if (this.hour >= 12 && this.hour < 17) return "[time-event: après-midi]";
        if (this.hour >= 17 && this.hour < 21) return "[time-event: soirée]";
        return "[time-event: nuit]";
    }

    /**
     * Sérialise l'état de l'horloge en JSON.
     */
    public serialize(): string {
        return JSON.stringify({
            day: this.day,
            hour: this.hour,
            minute: this.minute,
            dayNames: this.dayNames,
        });
    }

    /**
     * Crée une instance de GameClock à partir d'une chaîne JSON.
     */
    public static deserialize(jsonString: string): GameClock {
        try {
            const data = JSON.parse(jsonString);
            return new GameClock(data);
        } catch (e) {
            console.error("Failed to deserialize GameClock state, returning default.", e);
            return new GameClock();
        }
    }
}
