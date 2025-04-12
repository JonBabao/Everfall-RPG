import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase.js";

export const data = new SlashCommandBuilder()
    .setName('map')
    .setDescription("Describe details of your current area!")

export const execute = async (interaction) => {
    await interaction.deferReply();

    const { data: character, charError } = await supabase
        .from('player')
        .select('name, location')
        .eq('id', interaction.user.id)
        .single()

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        });
    }

    const { data: map, mapError } = await supabase
        .from('map')
        .select('name, description, shop_owner, monster')
        .eq('name', character.location)
        .single()

    if (!map || mapError) {
        return interaction.editReply({
            content: "❌ Error loading map data"
        });
    }

    const mapEmbed = new EmbedBuilder()
        .setTitle(`🗺️ ${map.name}`)
        .setDescription(`*${map.description}*`)
        .addFields(
            { name: '👥 NPCs', value: map.shop_owner.map(owner => 
                `• ${owner}`
            ).join('\n'), inline: false },
            { name: '👾 Monsters', value: map.monster.map(monster => 
                `• ${monster}`
            ).join('\n'), inline: false }
        )
        .setFooter({ text: '/map' })
        .setColor(0x00AE86)


    await interaction.editReply({ embeds: [mapEmbed] });
}