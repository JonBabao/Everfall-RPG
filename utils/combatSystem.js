export class CombatSystem {
    constructor(character, enemy) {
        this.character = { ...character };
        this.enemy = { ...enemy };
        this.turn = 'enemy';
        this.characterAspd = character.aspd; 
        this.enemyAspd = enemy.aspd;    
        this.combatLog = [];
    }

    determineFirstAttack() {
        return this.enemy.aspd > this.character.aspd ? 'enemy' : 'player';
    }

    calculateDamage(attacker, defender, damageType) {
        const baseDamage = attacker[`${damageType}_damage`];
        const penetration = attacker[damageType === 'attack' ? 'armor_penetration' : 'magic_penetration'];
        const defense = defender[damageType === 'attack' ? 'armor' : 'magic_armor'];
        
        const damage = Math.max(1, Math.floor(
            baseDamage - (defense-(penetration*defense))
        ));
        console.log(`Damage calc: ${baseDamage} - (${defense} - (${penetration} * ${defense})) = ${damage}`);
        return damage;
    }

    basicAttack() {
        const damage = this.calculateDamage(this.character, this.enemy, 'attack');
        this.enemy.current_hp = Math.max(0, this.enemy.current_hp - damage);
        this.combatLog.push(`${this.character.name} attacks for ${damage} damage!`);
        this.enemyAspd += this.enemy.aspd;
        return this.checkBattleStatus();
    }

    enemyTurn() {
        while (this.characterAspd < this.enemyAspd) {
            const damage = this.calculateDamage(this.enemy, this.character, 'attack');
            this.character.current_hp = Math.max(0, this.character.current_hp - damage);
            this.combatLog.push(`${this.enemy.name} attacks for ${damage} damage!`); 
            this.characterAspd += this.character.aspd;
        }
        return this.checkBattleStatus();
    }

    checkBattleStatus() {
        if (this.enemy.current_hp <= 0) {
            return { over: true, winner: this.character.name };
        }
        if (this.character.current_hp <= 0) {
            return { over: true, winner: this.enemy.name };
        }

        this.turn = this.turn === 'player' ? 'enemy' : 'player';
        return { over: false, turn: this.turn };
    }
}