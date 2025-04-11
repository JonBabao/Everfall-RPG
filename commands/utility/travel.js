import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { lockUser, unlockUser, isUserLocked } from '../../utils/lockSystem.js';
import { supabase } from '../../supabase/supabase.js';

export const data = new SlashCommandBuilder()
    .setName('travel')
    .setDescription('Begin a journey to another location')
    .addStringOption(option =>
        option.setName('destination')
            .setDescription('Where you want to travel')
            .setRequired(true)
    );

export const execute = async(interaction) => {
    const existingLock = await isUserLocked(interaction.user.id);
    const destination = interaction.options.getString('destination');
    const travelTime = 30 * 1000; 
    await interaction.deferReply();

    const { data: character, charError } = await supabase
        .from('player')
        .select('id, name, location')
        .eq('id', interaction.user.id)
        .single()

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        })
    }

    if (character.location == destination) {
        return interaction.editReply({
            content: `❌ You are already at ${destination}!`
        })
    }

    if (existingLock) {
        return interaction.editReply({
            content: `⏳ You're already ${existingLock.reason} (completes <t:${Math.floor(existingLock.expires / 1000)}:R>)`,
            ephemeral: true
        });
    }

    await lockUser(interaction.user.id, 'traveling', travelTime);

    const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle(`Traveling to ${destination}`)
        .setDescription(createProgressBar(0))
        .addFields(
            { name: '🔒 Status', value: 'Commands temporarily locked while traveling', inline: false },
            { name: '⏱️ ETA', value: `<t:${Math.floor((Date.now() + travelTime) / 1000)}:R>`, inline: false }
        );

    const reply = await interaction.editReply({ embeds: [embed] });
    const startTime = Date.now();

    const interval = setInterval(async () => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, travelTime - elapsed);
        const progress = 1 - (remaining / travelTime);

        embed.setDescription(createProgressBar(progress));

        if (remaining <= 0) {
            clearInterval(interval);
            await unlockUser(interaction.user.id);
            embed.setColor('#00FF00')
                .setDescription(`✅ **${character.name}** arrived at **${destination}**!`)
                .spliceFields(0, 2); 
            await reply.edit({ embeds: [embed] });
        } else {
            await reply.edit({ embeds: [embed] });
        }
    }, 5000);

    const { travelError } = await supabase
        .from('player')
        .update({ location: destination })
        .eq('id', interaction.user.id)
        
    if (travelError) {
        return await editReply({
            content: "Error occured while traveling"
        })
    }

    setTimeout(() => unlockUser(interaction.user.id), travelTime + 5000);
}

function createProgressBar(progress) {
    const filled = Math.round(progress * 10);
    return `${'🟢'.repeat(filled)}${'⚪'.repeat(10 - filled)} ${Math.round(progress * 100)}%`;
}