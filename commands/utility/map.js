import { SlashCommandBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase";

export const data = new SlashCommandBuilder()
    .setName('map')
    .setDescription("Describe details of your current area!")

    
export const execute = async (interaction) => {

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
        .select('name, shop_owner, monster')
        .eq('name', character.location)
        .single()

    if (!map || mapError) {
        return interaction.editReply({
            content: "❌ Error loading map data"
        });
    }

    const mapEmbed = new EmbedBuilder()
        .setTitle(map.name)
        .setDescription("**Map Details**")
        .addFields(
            { name: 'NPCs', value: map.map(o => 
                `• ${shop_owner}`
            ).join('\n'), inline: false },
            { name: 'Monsters', value: map.monster.map(o => 
                `• ${monster}`
            ).join('\n'), inline: false }
        )
        .setColor(0x00AE86);

    await interaction.reply({ embeds: [mapEmbed] });
}