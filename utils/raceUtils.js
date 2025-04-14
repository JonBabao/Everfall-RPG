export const getRaceBonuses = (race) => {
    const baseStats = {
        str: 11,
        con: 10,
        dex: 10,
        agi: 10,
        int: 10
    };

    switch (race.toLowerCase()) {
        case 'human':
            return {
                ...baseStats,
                str: baseStats.str + 1,
                con: baseStats.con + 1,
                dex: baseStats.dex + 1,
                agi: baseStats.agi + 1,
                int: baseStats.int + 1
            };
        case 'half-orc':
            return {
                ...baseStats,
                con: baseStats.con + 2,
                str: baseStats.str + 2
            };
        case 'elf':
            return {
                ...baseStats,
                int: baseStats.int + 2,
                dex: baseStats.dex + 2
            };
        case 'dwarf':
            return {
                ...baseStats,
                con: baseStats.con + 3,
                str: baseStats.str + 1
            };
        case 'halfling':
            return {
                ...baseStats,
                agi: baseStats.agi + 2,
                dex: baseStats.dex + 2
            };
        default:
            return baseStats;
    }
};