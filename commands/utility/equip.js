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

    // Check if user has character
    const { data: character, error: charError } = await supabase
        .from('player')
        .select('name, weapon, body_armor, off_hand')
        .eq('id', interaction.user.id)
        .single()

    if (charError || !character) {
        return interaction.reply({
            content: "❌ You don't have a character yet! Use `/create` to make one.",
            ephemeral: true
        })
    }

    // Check if item exists
    const { data: item, error: itemError } = await supabase
        .from('items')
        .select('id, type')
        .eq('name', itemName)
        .single();

    if (itemError || !item) {
        return interaction.reply({
            content: "❌ This item doesn't exist!",
            ephemeral: true
        })
    }

    // Then check inventory
    const { data: hasItem, error: hasError } = await supabase
        .from('inventory')
        .select('player_id, is_equipped')
        .eq('player_id', interaction.user.id)
        .eq('item_id', item.id)
        .single();

    if (!hasItem || hasError) {
        return interaction.reply({
            content: "❌ You don't have this item!",
            ephemeral: true
        })
    }

    let equipmentSlot;
    switch(item.type) {
        case 'sword':
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
            return interaction.reply({
                content: "❌ This item type cannot be equipped!",
                ephemeral: true
            });
    }

    if (character.weapon != "None") {
        const { data: currentWeaponItem } = await supabase
            .from('items')
            .select('id')
            .eq('name', character.weapon)
            .single();

        if (currentWeaponItem) {
            await supabase
                .from('inventory')
                .update({ is_equipped: false })
                .eq('player_id', interaction.user.id)
                .eq('item_id', currentWeaponItem.id)
                .eq('is_equipped', true);
        }
    }

    const { error: updateError } = await supabase
        .from('player')
        .update({ [equipmentSlot]: itemName })
        .eq('id', interaction.user.id);

    if (updateError) {
        return interaction.reply({
            content: "❌ Failed to equip item!",
            ephemeral: true
        });
    }

    const { error: equipError } = await supabase
        .from('inventory')
        .update({ is_equipped: true })
        .eq('player_id', interaction.user.id)
        .eq('item_id', item.id);

    if (equipError) {
        return interaction.reply({
            content: "❌ Failed to update equipment status!",
            ephemeral: true
        });
    }

    await interaction.editReply({
        content: `✅ Successfully equipped ${itemName}!`,
        ephemeral: true
    });
}