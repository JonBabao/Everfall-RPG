import { supabase } from "../supabase/supabase.js";

const XP_CHART = [
    0, 100, 300, 600, 900, 1500, 2100, 2800, 3600, 4500, 
    5500, 6600, 7800, 9100, 10500, 12000, 13600, 15300, 
    17100, 19000, 21000, 23100, 25300, 27600, 30000, 
    32500, 35100, 37800, 40600, 43500, 46500
];


export class StatSystem {
    constructor(character, userId) {
        this.originalStats = { ...character };
        this.character = { ...character };
        this.userId = userId;
        this.updateDerivedStats();
    }

    // ========================
    //  CORE STAT CALCULATIONS
    // ========================
    updateDerivedStats() {
        // Ensure core stats exist
        const { str = 0, con = 0, int = 0, dex = 0, agi = 0 } = this.character;

        // Physical combat stats
        this.character.armor_penetration = this.calculatePercentage(str);
        this.character.armor = con;
        this.character.hit_rate = this.calculatePercentage(dex);
        
        // Magical combat stats
        this.character.magic_penetration = this.calculatePercentage(int);
        this.character.magic_armor = int;
        
        // Mobility stats
        this.character.evasion = this.calculatePercentage(agi);
        this.character.aspd = this.calculatePercentage(agi);
        
        // Health calculations
        this.character.max_hp = 100 + (con * 10) + (this.character.level * 10);
        this.character.current_hp = Math.min(
            this.character.current_hp || this.character.max_hp,
            this.character.max_hp
        );
    }

    calculatePercentage(statValue) {
        return parseFloat((statValue * 0.01).toFixed(2));
    }

    // ========================
    //  LEVEL UP SYSTEM
    // ========================
    async checkLevelUp(gainedExp) {
        let newExp = this.character.exp + gainedExp;
        let levelsGained = 0;
        const statGains = {};
        
        // Check for multiple level ups
        while (this.canLevelUp(newExp)) {
            this.character.level += 1;
            levelsGained += 1;
            this.applyLevelUpStats(statGains);
            newExp = this.character.exp + gainedExp; 
        }
        
        this.character.exp = newExp;
        
        if (levelsGained > 0) {
            this.updateDerivedStats();
            await this.updateDatabase();
            return this.createLevelUpResult(levelsGained, statGains);
        }
        
        return { leveledUp: false };
    }

    canLevelUp(currentExp) {
        return this.character.level < XP_CHART.length - 1 && 
               currentExp >= XP_CHART[this.character.level + 1];
    }

    applyLevelUpStats(statGains) {
        const statCycle = ['str', 'con', 'int', 'agi', 'dex'];
        const statToBoost = statCycle[(this.character.level - 1) % statCycle.length];
        this.character[statToBoost] += 1;
        this.character.stat_point++;
        statGains[statToBoost] = (statGains[statToBoost] || 0) + 1;
    }

    createLevelUpResult(levelsGained, statGains) {
        return {
            leveledUp: true,
            newLevel: this.character.level,
            newExp: this.character.exp,
            statGains,
            newStats: { ...this.character },
            levelsGained,
            message: this.createLevelUpMessage(levelsGained, statGains)
        };
    }

    createLevelUpMessage(levelsGained, statGains) {
        const statMessages = Object.entries(statGains)
            .map(([stat, value]) => `+${value} ${stat.toUpperCase()}`)
            .join(', ');
        
        return `🎉 Level Up! (${levelsGained} level${levelsGained > 1 ? 's' : ''})\n` +
               `New Stats: ${statMessages}\n` +
               `Max HP: ${this.character.max_hp}`;
    }

    // ========================
    //  DATABASE OPERATIONS
    // ========================
    async updateDatabase() {
        const { data, error } = await supabase
            .from('player')
            .update(this.getAllStats())
            .eq('id', this.userId)
            .select();

        if (error) {
            console.error('Database update failed:', error);
            throw new Error('Failed to update character stats');
        }

        this.originalStats = { ...this.character };
        return data[0];
    }

    async resetToOriginal(supabase) {
        this.character = { ...this.originalStats };
        return this.updateDatabase(supabase);
    }

    // ========================
    //  UTILITY METHODS
    // ========================
    getAllStats() {
        return { ...this.character };
    }

    getCoreStats() {
        return {
            str: this.character.str,
            con: this.character.con,
            int: this.character.int,
            dex: this.character.dex,
            agi: this.character.agi,
        };
    }

    getCombatStats() {
        return {
            armor_penetration: this.character.armor_penetration,
            armor: this.character.armor,
            magic_penetration: this.character.magic_penetration,
            magic_armor: this.character.magic_armor,
            hit_rate: this.character.hit_rate,
            evasion: this.character.evasion,
            aspd: this.character.aspd,
            max_hp: this.character.max_hp,
            current_hp: this.character.current_hp
        };
    }
}