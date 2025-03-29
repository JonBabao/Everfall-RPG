import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { supabase } from '../../supabase/supabase.js';
import { CombatSystem } from '../../utils/combatSystem.js';

export const data = new SlashCommandBuilder()
    .setName('combat')
    .setDescription('Initiate Battle')
    .addStringOption(option =>
        option.setName('enemy')
        .setDescription("Enter the name of your enemy")
        .setRequired(true)
    );

export const execute = async (interaction) => {
    const enemyName = interaction.options.getString('enemy');

    await interaction.deferReply({ ephemeral: true });

    try {
        // Fetch character data
        const { data: character, error: charError } = await supabase
            .from('player')
            .select(`
                name, char_class, attack_damage, magic_damage, 
                armor_penetration, magic_penetration, current_hp,
                max_hp, armor, magic_armor, evasion, aspd, hit_rate
            `)
            .eq('id', interaction.user.id)
            .single();

        if (!character || charError) {
            return await interaction.editReply({
                content: "❌ You don't have a character yet! Use `/create` to make one."
            });
        }

        // Fetch enemy data
        const { data: enemy, error: enemyError } = await supabase 
            .from('monster')
            .select(`
                name, attack_damage, magic_damage, armor_penetration,
                magic_penetration, armor, magic_armor, max_hp,
                current_hp, evasion, aspd, hit_rate
            `)
            .eq('name', enemyName)
            .single();
        
        if (!enemy || enemyError) {
            return await interaction.editReply({
                content: "❌ Couldn't find that enemy!"
            });
        }

        const combat = new CombatSystem(character, enemy);

        const createCombatEmbed = () => {
            return new EmbedBuilder()
                .setTitle(`${combat.character.name} VS ${combat.enemy.name}`)
                .setDescription(`
                    **${combat.character.name}**
                    HP: ${combat.character.current_hp}/${combat.character.max_hp}

                    **${combat.enemy.name}**
                    HP: ${combat.enemy.current_hp}/${combat.enemy.max_hp}

                    ${combat.combatLog.slice(-3).join('\n')}
                `)
                .setColor('#FF0000');
        };

        const createActionButtons = () => {
            const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('attack')
                    .setLabel('Attack')
                    .setStyle(ButtonStyle.Primary),
            );       
            return row;
        };


        const message = await interaction.editReply({ 
            embeds: [createCombatEmbed()], 
            components: [createActionButtons()] 
        });

        const collector = message.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id,
            time: 60000 
        });

        collector.on('collect', async buttonInteraction => {
            try {
                let result;
                
                if (buttonInteraction.customId === 'attack') {
                    if (combat.turn === 'enemy') {
                        result = combat.enemyTurn();
                        if (!result.over) {
                            result = combat.basicAttack();
                        }
                    } else {
                        result = combat.basicAttack();
                        if (!result.over) {
                            result = combat.enemyTurn();
                        }
                    }
                }

                if (result?.over) {
                    collector.stop();
                    return await buttonInteraction.update({
                        content: `🏆 ${result.winner} won the battle!`,
                        embeds: [createCombatEmbed()],
                        components: []
                    });
                }

                await buttonInteraction.update({
                    embeds: [createCombatEmbed()],
                    components: [createActionButtons()]
                });

            } catch (error) {
                console.error('Combat error:', error);
                await buttonInteraction.followUp({
                    content: "❌ An error occurred during combat.",

                });
            }
        });

        collector.on('end', () => {
        });

    } catch (error) {
        console.error('Combat command error:', error);
        await interaction.editReply({
            content: "❌ An error occurred while starting combat."
        });
    }
};