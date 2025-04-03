import { SlashCommandBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase.js";

export const data = new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Gear up and equip items!')
    .addStringOption(option =>
        option.setName('item_name')
            .setDescription("Enter the name of the item you want to equip")
            .setRequired(true)
    )

export const execute = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const itemName = interaction.options.getString('item_name');

    const { data: character, error: charError } = await supabase
        .from('player')
        .select(`
            name, 
            weapon, 
            body_armor, 
            off_hand,
            str, 
            con, 
            int, 
            dex, 
            agi,
            attack_damage,
            magic_damage,
            armor,
            magic_armor,
            armor_penetration,
            magic_penetration,
            hit_rate,
            evasion,
            aspd
        `)
        .eq('id', interaction.user.id)
        .single();

    if (charError || !character) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one.",
            ephemeral: true
        });
    }

    const { data: newItem, error: itemError } = await supabase
        .from('items')
        .select('id, type, attributes')
        .eq('name', itemName)
        .single();

    if (itemError || !newItem) {
        return interaction.editReply({
            content: "❌ This item doesn't exist!",
            ephemeral: true
        });
    }

    const itemAttributes = newItem.attributes || {};
    const {
        attack_damage = 0,
        magic_damage = 0,
        armor = 0,
        magic_armor = 0,
        armor_penetration = 0,
        magic_penetration = 0,
        hit_rate = 0,
        evasion = 0,
        aspd = 0
    } = itemAttributes;


    const { data: hasItem, error: hasError } = await supabase
        .from('inventory')
        .select('player_id, is_equipped')
        .eq('player_id', interaction.user.id)
        .eq('item_id', newItem.id)
        .single();

    if (!hasItem || hasError) {
        return interaction.editReply({
            content: "❌ You don't have this item!",
            ephemeral: true
        });
    }

    let equipmentSlot;
    switch(newItem.type) {
        case 'sword':
        case 'hammer':
        case 'spear':
        case 'fist':
        case 'dagger':
        case 'bow':
        case 'magical_focus':
            equipmentSlot = 'weapon';
            break;
        case 'body_armor':
            equipmentSlot = 'body_armor';
            break;
        case 'shield':
            equipmentSlot = 'off_hand';
            break;
        default:
            return interaction.editReply({
                content: "❌ This item type cannot be equipped!",
                ephemeral: true
            });
    }

    const updatedStats = { ...character };

    if (character[equipmentSlot] && character[equipmentSlot] !== "None") {
        const { data: currentItem } = await supabase
            .from('items')
            .select('id, type, attributes')
            .eq('name', character[equipmentSlot])
            .single();

        if (currentItem) {
            await supabase
                .from('inventory')
                .update({ is_equipped: false })
                .eq('player_id', interaction.user.id)
                .eq('item_id', currentItem.id)
                .eq('is_equipped', true);


            const currentAttributes = currentItem.attributes || {};
            updatedStats.attack_damage -= currentAttributes.attack_damage || 0;
            updatedStats.magic_damage -= currentAttributes.magic_damage || 0;
            updatedStats.armor -= currentAttributes.armor || 0;
            updatedStats.magic_armor -= currentAttributes.magic_armor || 0;
            updatedStats.armor_penetration -= currentAttributes.armor_penetration || 0;
            updatedStats.magic_penetration -= currentAttributes.magic_penetration || 0;
            updatedStats.hit_rate -= currentAttributes.hit_rate || 0;
            updatedStats.evasion -= currentAttributes.evasion || 0;
            updatedStats.aspd -= currentAttributes.aspd || 0;


            const removedBonuses = calculateWeaponBonuses(currentItem.type, character);
            updatedStats.attack_damage -= removedBonuses.attack;
            updatedStats.magic_damage -= removedBonuses.magic;
        }
    }

    updatedStats.attack_damage += attack_damage;
    updatedStats.magic_damage += magic_damage;
    updatedStats.armor += armor;
    updatedStats.magic_armor += magic_armor;
    updatedStats.armor_penetration += armor_penetration;
    updatedStats.magic_penetration += magic_penetration;
    updatedStats.hit_rate += hit_rate;
    updatedStats.evasion += evasion;
    updatedStats.aspd += aspd;

    const newBonuses = calculateWeaponBonuses(newItem.type, character);
    updatedStats.attack_damage += newBonuses.attack;
    updatedStats.magic_damage += newBonuses.magic;

    for (const stat in updatedStats) {
        if (typeof updatedStats[stat] === 'number') {
            updatedStats[stat] = Math.max(0, updatedStats[stat]);
        }
    }

    const { error: updateError } = await supabase
        .from('player')
        .update({ 
            [equipmentSlot]: itemName,
            attack_damage: updatedStats.attack_damage,
            magic_damage: updatedStats.magic_damage,
            armor: updatedStats.armor,
            magic_armor: updatedStats.magic_armor,
            armor_penetration: updatedStats.armor_penetration,
            magic_penetration: updatedStats.magic_penetration,
            hit_rate: updatedStats.hit_rate,
            evasion: updatedStats.evasion,
            aspd: updatedStats.aspd
        })
        .eq('id', interaction.user.id);

    if (updateError) {
        return interaction.editReply({
            content: "❌ Failed to equip item!",
            ephemeral: true
        });
    }

    const { error: equipError } = await supabase
        .from('inventory')
        .update({ is_equipped: true })
        .eq('player_id', interaction.user.id)
        .eq('item_id', newItem.id);

    if (equipError) {
        return interaction.editReply({
            content: "❌ Failed to update equipment status!",
            ephemeral: true
        });
    }

    let bonusMessage = '';
    if (newBonuses.attack) bonusMessage += `+${newBonuses.attack} attack damage `;
    if (newBonuses.magic) bonusMessage += `${bonusMessage ? 'and ' : ''}+${newBonuses.magic} magic damage`;
    if (attack_damage) bonusMessage += `${bonusMessage ? ', ' : ''}+${attack_damage} base weapon attack`;
    if (magic_damage) bonusMessage += `${bonusMessage ? ', ' : ''}+${magic_damage} base weapon magic`;

    await interaction.editReply({
        content: `✅ Successfully equipped ${itemName}! ${bonusMessage ? `(${bonusMessage})` : ''}`,
        ephemeral: true
    });
}

function calculateWeaponBonuses(weaponType, character) {
    const result = { attack: 0, magic: 0 };
    
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
    }
    
    return result;
}