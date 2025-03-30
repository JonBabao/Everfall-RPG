import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { supabase } from '../../supabase/supabase.js';

export const data = new SlashCommandBuilder()
    .setName('distribute')
    .setDescription('Distribute your available stat points');

export const execute = async (interaction) => {
    await interaction.deferReply({ ephemeral: true });

    try {
        const { data: character, error } = await supabase
            .from('player')
            .select('*')
            .eq('id', interaction.user.id)
            .single();

        if (error || !character) {
            return interaction.editReply({
                content: "❌ You don't have a character yet! Use `/create` to make one.",
                ephemeral: true
            });
        }

        if (character.stat_point <= 0) {
            return interaction.editReply({
                content: "❌ You don't have any stat points to distribute!",
                ephemeral: true
            });
        }

        const calculateDerivedStats = (char) => ({
            armor_penetration: (char.str * 0.01).toFixed(2),
            max_hp: 100 + (char.con * 10),
            armor: char.con,
            magic_penetration: (char.int * 0.01).toFixed(2),
            magic_armor: char.int,
            hit_rate: (char.dex * 0.01).toFixed(2),
            evasion: (char.agi * 0.01).toFixed(2),
            aspd: (1 + (char.agi * 0.01)).toFixed(2)
        });

        let currentDerived = calculateDerivedStats(character);
        const statChanges = {
            str: 0, con: 0, int: 0, dex: 0, agi: 0,
            remainingPoints: character.stat_point
        };

        const createStatEmbed = () => new EmbedBuilder()
            .setTitle(`${character.name}'s Stats`)
            .setDescription(`You have **${statChanges.remainingPoints} stat points** available`)
            .setColor('#0099ff')
            .addFields(
                { 
                    name: 'Core Stats', 
                    value: `
\`\`\`
STR: ${character.str} + ${statChanges.str} → ${character.str + statChanges.str}
CON: ${character.con} + ${statChanges.con} → ${character.con + statChanges.con}
INT: ${character.int} + ${statChanges.int} → ${character.int + statChanges.int}
DEX: ${character.dex} + ${statChanges.dex} → ${character.dex + statChanges.dex}
AGI: ${character.agi} + ${statChanges.agi} → ${character.agi + statChanges.agi}
\`\`\`
                `,
                    inline: false 
                },
            { 
                name: 'Derived Stats', 
                value: `
\`\`\`
Max HP: ${100 + (character.con * 10) + (character.level * 10)} → ${100 + ((character.con + statChanges.con) * 10) + (character.level * 10)}
Armor: ${character.con} → ${character.con + statChanges.con}
Magic Armor: ${character.int} → ${character.int + statChanges.int}
Armor Pen: ${(character.str * 0.01).toFixed(2)}% → ${((character.str + statChanges.str) * 0.01).toFixed(2)}%
Magic Pen: ${(character.int * 0.01).toFixed(2)}% → ${((character.int + statChanges.int) * 0.01).toFixed(2)}%
Evasion: ${(character.agi * 0.01).toFixed(2)}% → ${((character.agi + statChanges.agi) * 0.01).toFixed(2)}%
Hit Rate: ${(character.dex * 0.01).toFixed(2)}% → ${((character.dex + statChanges.dex) * 0.01).toFixed(2)}%
Attack Speed: ${(character.agi * 0.01).toFixed(2)} → ${(((character.agi + statChanges.agi) * 0.01)).toFixed(2)}
\`\`\`
                `,
                inline: false 
            }
        );

        const createActionRows = () => [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('str')
                    .setLabel(`+1 STR`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(statChanges.remainingPoints <= 0),
                new ButtonBuilder()
                    .setCustomId('con')
                    .setLabel(`+1 CON`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(statChanges.remainingPoints <= 0),
                new ButtonBuilder()
                    .setCustomId('int')
                    .setLabel(`+1 INT`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(statChanges.remainingPoints <= 0)
            ),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('dex')
                    .setLabel(`+1 DEX`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(statChanges.remainingPoints <= 0),
                new ButtonBuilder()
                    .setCustomId('agi')
                    .setLabel(`+1 AGI`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(statChanges.remainingPoints <= 0),
                new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(statChanges.remainingPoints === character.stat_point)
            )
        ];

        const message = await interaction.editReply({
            embeds: [createStatEmbed()],
            components: createActionRows()
        });

        const collector = message.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id, 
            time: 60000 
        });

        collector.on('collect', async buttonInteraction => {
            try {
                if (buttonInteraction.customId === 'confirm') {
                    // Calculate final stats with changes
                    const finalStats = {
                        str: character.str + statChanges.str,
                        con: character.con + statChanges.con,
                        int: character.int + statChanges.int,
                        dex: character.dex + statChanges.dex,
                        agi: character.agi + statChanges.agi,
                        stat_point: statChanges.remainingPoints,
                        // Update derived stats
                        armor_penetration: (character.str + statChanges.str) * 0.01,
                        max_hp: 100 + ((character.con + statChanges.con) * 10) + (character.level * 10),
                        armor: character.con + statChanges.con,
                        magic_penetration: (character.int + statChanges.int) * 0.01,
                        magic_armor: character.int + statChanges.int,
                        hit_rate: (character.dex + statChanges.dex) * 0.01,
                        evasion: (character.agi + statChanges.agi) * 0.01,
                        aspd: ((character.agi + statChanges.agi) * 0.01),
                        // Maintain current HP percentage
                        current_hp: Math.min(
                            character.current_hp, 
                            100 + ((character.con + statChanges.con) * 10)
                        )
                    };

                    const { error } = await supabase
                        .from('player')
                        .update(finalStats)
                        .eq('id', interaction.user.id);

                    if (error) throw error;

                    collector.stop();
                    return buttonInteraction.update({
                        content: `✅ Stats updated! ${character.stat_point - statChanges.remainingPoints} points distributed.`,
                        embeds: [],
                        components: []
                    });
                }

                const stat = buttonInteraction.customId;
                statChanges[stat] += 1;
                statChanges.remainingPoints -= 1;

                await buttonInteraction.update({
                    embeds: [createStatEmbed()],
                    components: createActionRows()
                });

            } catch (error) {
                console.error('Stat distribution error:', error);
                await buttonInteraction.followUp({
                    content: "❌ Failed to update stats",
                    ephemeral: true
                });
            }
        });

        collector.on('end', () => {
            if (!collector.ended) {
                interaction.editReply({
                    content: "⏲️ Stat distribution timed out",
                    components: []
                });
            }
        });

    } catch (error) {
        console.error('Distribute command error:', error);
        await interaction.editReply({
            content: "❌ An error occurred while processing your request",
            ephemeral: true
        });
    }
};