import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { supabase } from '../../supabase/supabase.js';

export const data = new SlashCommandBuilder()
    .setName('item')
    .setDescription("View information about an item")
    .addStringOption(option =>
        option.setName('item_name')
        .setDescription("Enter item name: ")
        .setRequired(true)
    );

export const execute = async (interaction) => {
    const itemName = interaction.options.getString('item_name');

    const { data: item, error } = await supabase
        .from('items')
        .select('name, description, type, rarity, effect, price')
        .eq('name', itemName)
        .single()

    if (!item, error) {
        await interaction.reply({
            content: "This item doesn't exist!",
            ephemeral: true
        })
    }

    const itemEmbed = new EmbedBuilder()
        .setTitle(itemName)
        .setDescription(
            `
            *${item.rarity} ${item.type}*

            **Description**
            ${item.description}

            **Effect**
            ${item.effect}

            **Price:** ${item.price} Gold
            `
        )
        .setColor(0x00AE86);

    await interaction.reply({ embeds: [itemEmbed] });
    
};