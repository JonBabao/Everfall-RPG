export class CombatSystem {
    constructor(character, enemy) {
        this.character = character;
        this.enemy = enemy;
        this.turn = 'player';
        this.combatLog = [];
    }

    calculateDamage(attacker, defender, damageType) {
        const baseDamage = attacker[`${damageType}_damage`];
        const penetration = attacker[`${damageType}_penetration`];
        const defense = defender[damageType == 'attack' ? 'armor' : 'magic_armor'];

        return Math.max(1, Math.floor(
            baseDamage - (defense*(penetration*defense)))
        );
    }


}