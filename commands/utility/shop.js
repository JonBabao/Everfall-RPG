import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase.js";

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription("View shop and see what's in stock!");

export const execute = async (interaction) => {
    await interaction.deferReply();
    
    const { data: character, error: charError } = await supabase
        .from('player')
        .select('id, name, gold')
        .eq('id', interaction.user.id)
        .single();

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        });
    }

    const { data: items, error: itemsError } = await supabase
        .from('shop')
        .select('items (name, price, description)') 
        .eq('area', "home")


    if (!items || itemsError || items.length === 0) {
        return interaction.editReply({
            content: "❌ The shop is currently empty or there was an error loading items."
        });
    }

    const shopEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('🏪 Item Shop')
    .setDescription(`Welcome to the shop, ${character.name}!\n\n` +
        items.map(item => `• **${item.items.name}**: ${item.items.price} gold`).join('\n'))
    .setFooter({ text: `Your balance: ${character.gold} gold` });

    await interaction.editReply({ embeds: [shopEmbed] });
};