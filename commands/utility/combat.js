import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { supabase } from '../../supabase/supabase.js';
import { CombatSystem } from '../../utils/combatSystem.js';
import { StatSystem } from '../../utils/statSystem.js';

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

    await interaction.deferReply({ });

    try {
        // Fetch character data
        const { data: character, error: charError } = await supabase
        .from('player')
        .select(`
            name,
            level,
            exp,
            str,
            con,
            int,
            dex,
            agi,
            attack_damage,
            magic_damage,
            current_hp,
            max_hp,
            armor_penetration,
            armor,
            magic_penetration,
            magic_armor,
            hit_rate,
            evasion,
            aspd,
            stat_point
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
                current_hp, evasion, aspd, hit_rate, exp
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
            const combatStatus = `\`\`\`
${combat.character.name} vs ${combat.enemy.name}

${combat.character.name} HP: ${combat.character.current_hp}/${combat.character.max_hp}
${combat.enemy.name} HP: ${combat.enemy.current_hp}/${combat.enemy.max_hp}
\`\`\``;
        
            const battleLog = `\`\`\`
${combat.combatLog.slice(-3).join('\n') || "Battle begins..."}
\`\`\``;
        
            return new EmbedBuilder()
                .setTitle("⚔️ Battle in Progress")
                .setDescription(`${combatStatus}\n${battleLog}`)
                .setColor('#FF0000')
                .setFooter({ text: "Use the buttons to take action" });
        };
        
        const createVictoryEmbed = (expGained = 0) => {
            const rewards = `\`\`\`
Rewards: ${expGained} EXP gained!
\`\`\``;
        
            return new EmbedBuilder()
                .setTitle("🏆 Battle Results")
                .setDescription(`${createCombatEmbed().data.description}\n${rewards}`)
                .setColor('#00FF00');
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
                        if (!result?.over) {
                            result = combat.basicAttack();
                        }
                    } else {
                        result = combat.basicAttack();
                        if (!result?.over) {
                            result = combat.enemyTurn();
                        }
                    }
                }
        
                if (result?.over) {
                    collector.stop();
                    
                    if (character.name === result.winner) {
                        const statSystem = new StatSystem(character, interaction.user.id);
                        const result = await statSystem.checkLevelUp(enemy.exp);

                        const { error: updateError } = await supabase
                        .from('player')
                        .update({ 
                            current_hp: combat.character.current_hp
                        })
                        .eq('id', interaction.user.id);
                    
                        if (updateError) {
                            console.error("Current HP update error:", updateError);
                            return await buttonInteraction.editReply({
                                content: "❌ Couldn't save your rewards!",
                                embeds: [createVictoryEmbed(0)],
                                components: []
                            });
                        }

                        if (result.leveledUp) {
                            await interaction.followUp(result.message);
                        }
                        
                        return await buttonInteraction.update({
                            embeds: [createVictoryEmbed(enemy.exp)],
                            components: []
                        });
                    }
                    
                    return await buttonInteraction.update({
                        embeds: [createVictoryEmbed(0)],
                        components: []
                    });
                }
        
                // Ongoing battle update
                await buttonInteraction.update({
                    embeds: [createCombatEmbed()],
                    components: [createActionButtons()]
                });
        
            } catch (error) {
                console.error('Combat error:', error);
                
                // Check if we can still edit the reply
                if (buttonInteraction.deferred || buttonInteraction.replied) {
                    await buttonInteraction.editReply({
                        content: "❌ An error occurred during combat.",
                        embeds: [],
                        components: []
                    });
                } else {
                    await buttonInteraction.reply({
                        content: "❌ An error occurred during combat.",
                        ephemeral: true
                    });
                }
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