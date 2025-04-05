import { supabase } from '../../supabase/supabase.js';
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('sell')
    .setDescription("Sell your items to the shop!")
    .addStringOption(option =>
        option.setName('item')
        .setDescription("Enter item name")
        .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('quantity')
            .setDescription("How many would you like to sell?")
            .setRequired(true)
    );

export const execute = async (interaction) => {
    const itemName = interaction.options.getString('item');
    const quantityNum = interaction.options.getInteger('quantity');

    const { data: character, charError } = await supabase
        .from('player')
        .select('id, name, gold')
        .eq('id', interaction.user.id)
        .single()

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one.",
            ephemeral: true
        });
    }

    const { data: item, itemError } = await supabase
        .from('items')
        .select('id, name, price')
        .eq('name', itemName)
        .single()

    if (!item || itemError) {
        return interaction.editReply({
            content: "❌ This item doesn't exist!",
            ephemeral: true
        })
    }

    const { data: inventory, inventoryError } = await supabase
        .from('inventory')
        .select('player_id, item_id, quantity, is_equipped')
        .eq('player_id', interaction.user.id)
        .eq('item_id', item.id)

    if (!inventory || inventoryError) {
        return interaction.editReply({
            content: "❌ You don't have this item!",
            ephemeral: true
        })
    }

    if (inventory.is_equipped) {
        return interaction.editReply({
            content: "❌ You can't sell an equipped item!",
            ephemeral: true
        })
    }

    if (quantityNum > inventory.quantity) {
        return interaction.editReply({
            content: `❌ You only have ${item.name} x${inventory.quantity}!`,
            ephemeral: true
        })
    }

    if (quantityNum < inventory.quantity) {
        
    }
    

}