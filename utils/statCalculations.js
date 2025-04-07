export async function calculateWeaponBonuses(character, weaponType = null) {
    const result = { 
        attack: 0, 
        magic: 0
    };
    
    applyWeaponBonuses(weaponType, character, result);

    return result;
}

function applyWeaponBonuses(weaponType, character, result) {
    switch(weaponType) {
        case 'sword':
        case 'hammer':
            result.attack = character.str * 2;
            break;
        case 'spear':
            result.attack = (character.str + character.dex) * 2;
            break;
        case 'fist':
            result.attack = character.agi * 1;
            break;
        case 'dagger':
        case 'bow':
            result.attack = character.dex * 3;
            break;
        case 'magical_focus':
            result.magic = character.int * 3;
            break;
        default:
            console.log(`Unknown weapon type: ${weaponType}`);
    }
}

export function calculateDerivedStats(character, weaponStatModifiers = {}) {
    const effectiveStats = {
        ...character,
        str: character.str + (weaponStatModifiers.str || 0),
        con: character.con + (weaponStatModifiers.con || 0),
        int: character.int + (weaponStatModifiers.int || 0),
        dex: character.dex + (weaponStatModifiers.dex || 0),
        agi: character.agi + (weaponStatModifiers.agi || 0)
    };

    return {
        armor_penetration: (effectiveStats.str * 0.01).toFixed(2),
        max_hp: 100 + (effectiveStats.con * 10) + (effectiveStats.level * 10),
        armor: effectiveStats.con,
        magic_penetration: (effectiveStats.int * 0.01).toFixed(2),
        magic_armor: effectiveStats.int,
        hit_rate: (effectiveStats.dex * 0.01).toFixed(2),
        evasion: (effectiveStats.agi * 0.01).toFixed(2),
        aspd: (1 + (effectiveStats.agi * 0.01)).toFixed(2)
    };
}