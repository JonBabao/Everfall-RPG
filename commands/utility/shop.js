import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase.js";

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription("View shop and see what's in stock!");

export const execute = async (interaction) => {
    await interaction.deferReply();
    
    const { data: character, error: charError } = await supabase
        .from('player')
        .select('id, name, gold, location')
        .eq('id', interaction.user.id)
        .single();

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        });
    }

    const { data: areaShop } = await supabase
        .from('shop')
        .select('id')
        .eq('area', character.location)
        .single()

    const { data: items, error: itemsError } = await supabase
        .from('shop_items')
        .select(`
            item_id,
            shop_id,
            items (name, price),
            shop (name, owner, area, greeting)
        `)
        .eq('shop_id', areaShop.id) 

    if (!items || itemsError || items.length === 0) {
        return interaction.editReply({
            content: "❌ The shop is currently empty or there was an error loading items."
        });
    }

    const shopEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`🛒 ${items[0]?.shop?.name || 'Item Shop'}`)
        .setDescription(
            `\u200b
            **${items[0]?.shop?.owner}:** ${items[0]?.shop?.greeting}\n\n` +
            items.map(shopItem => 
                `• **${shopItem.items.name}**: ${shopItem.items.price} gold`
            ).join('\n')
        )
        .setFooter({ text: `Balance: ${character.gold} gold | Location: ${items[0]?.shop?.area || 'Unknown'}` });

await interaction.editReply({ embeds: [shopEmbed] });
};

