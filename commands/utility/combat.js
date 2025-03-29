import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Embed } from 'discord.js';
import { supabase } from '../../supabase/supabase.js'

export const data = new SlashCommandBuilder()
    .setName('combat')
    .setDescription('Initiate Battle')
    .addStringOption(option =>
        option.setName('enemy')
        .setDescription("Enter the name of your enemy")
        .setRequired(true)
    )

export const execute = async (interaction) => {
    const enemyName = interaction.options.getString('enemy');

    const { data: character, charError } = await supabase
        .from('player')
        .select(`
            name, 
            char_class, 
            attack_damage, 
            magic_damage, 
            armor_penetration, 
            magic_penetration,
            current_hp,
            max_hp,
            armor,
            magic_armor,
            evasion,
            aspd,
            hit_rate
            `)
        .eq('id', interaction.user.id)
        .single()

    if (!character || charError) {
        await interaction.reply({
            content: "❌ You don't have a character yet! Use `/create` to make one.",
            ephemeral: true
        })
    }

    const { data: enemy, enemyError } = await supabase 
        .from('monster')
        .select(`
            name,
            attack_damage,
            magic_damage,
            armor_penetration,
            magic_penetration,
            armor,
            magic_armor,
            max_hp,
            current_hp,
            evasion,
            aspd,
            hit_rate
            `)
        .eq('name', enemyName)
        .single()
    
    if (!enemy || enemyError) {
        await interaction.reply({
            content: "Error on fetching the monster.",
            ephemeral: true
        })
    }

    const createCombatEmbed = () => new EmbedBuilder()
        .setTitle(`${character.name} VS ${enemy.name}`)
        .setDescription(`
            ${character.name}'s HP: ${character.current_hp}/${character.max_hp}
            ${enemy.name}'s HP: ${enemy.current_hp}/${enemy.max_hp}
        `)
        .setColor('#FF0000');

    const actionButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('attack')
                .setLabel('Attack')
                .setStyle(ButtonStyle.Primary),
        );

    const combatMessage = await interaction.reply({ 
        embeds: [createCombatEmbed()], 
        components: [actionButtons],
        fetchReply: true 
    });

    const actionFilter = (i) => i.user.id === interaction.user.id;
    const actionCollector = combatMessage.createMessageComponentCollector({ 
        filter: actionFilter, 
        time: 30000 
    });

    actionCollector.on('collect', async (buttonInteraction) => {
        let actionMessage = ''

        switch(buttonInteraction.customId) {
            case 'attack':
                enemy.current_hp -= (character.attack_damage - (enemy.armor - (enemy.armor * character.armor_penetration)));
                actionMessage = `${character.name} attacks!`;
                break;
        }

        const updatedEmbed = createCombatEmbed()
            .addFields({ name: 'Action', value: actionMessage });

        await buttonInteraction.update({
            embeds: [updatedEmbed],
            components: [actionButtons]
        });
    })
};

