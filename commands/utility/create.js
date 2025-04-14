import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { supabase } from '../../supabase/supabase.js'
import { getRaceBonuses } from '../../utils/raceUtils.js';

export const data = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create your own character!')
    .addStringOption(option =>
        option.setName('name')
            .setDescription("Enter your character's name")
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('confirm-name')
            .setDescription("Re-enter your character's name")
            .setRequired(true)
    );

export const execute = async (interaction) => {
    const characterName = interaction.options.getString('name');
    const recharacterName = interaction.options.getString('confirm-name');

    if (characterName !== recharacterName) {
        await interaction.reply({
            content: "❌ The names do not match! Please try again.",
            ephemeral: true
        });
        return;
    }

    const raceEmbed = new EmbedBuilder()
        .setTitle("Choose Your Class")
        .setDescription(
            `
            There are many races that walk Everfall, **${characterName}**. To which race does your character belong to?

            **Human**
            ◈Humans are versatile beings known for their adaptability and ambition.
            ◇Racial Bonus: +1 on all attributes

            **Half-Orc**
            ◈Orcs are fierce and powerful warriors with a strong sense of honor and loyalty.
            ◇Racial Bonus: CON and STR +2

            **Elf**
            ◈Elves are graceful and ancient beings with a deep connection to nature and magic.
            ◇Racial Bonus: INT and DEX +2

            **Dwarf**
            ◈Dwarves are sturdy and skilled craftsmen who value tradition and loyalty.
            ◇Racial Bonus: CON +3 and STR +1

            **Halfling**
            ◈Halflings are small and nimble creatures known for their luck and love of good food.
            ◇Racial Bonus: AGI and DEX +2
            
            `)
        .setColor(0x00AE86);

    const raceRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('human')
                .setLabel('Human')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('half-orc')
                .setLabel('Half-Orc')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('elf')
                .setLabel('Elf')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('dwarf')
                .setLabel('Dwarf')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('halfling')
                .setLabel('Halfling')
                .setStyle(ButtonStyle.Primary),
        );

    await interaction.reply({ embeds: [raceEmbed], components: [raceRow] });

    const raceFilter = (i) => i.isButton() && i.user.id === interaction.user.id;
    const raceCollector = interaction.channel.createMessageComponentCollector({ raceFilter, time: 30000 });

    raceCollector.on('collect', async (buttonInteraction) => {
        let race = null;

        switch (buttonInteraction.customId) {  
            case 'human':
                race = 'Human';
                break;
            case 'half-orc':
                race = 'Half-Orc';
                break;
            case 'elf':
                race = 'Elf';
                break;
            case 'dwarf':
                race = 'Dwarf';
                break;
            case 'halfling':
                race = 'Halfling';
                break;
            default:
                return;
        }

        if (race) {
            await buttonInteraction.update({
                content: `**${characterName}**, you are now a **${race}**!`,
                components: [],
                embeds: [],
            });
            raceCollector.stop();

            const weaponFilter = (i) => i.isButton() && i.user.id === interaction.user.id;
            const weaponCollector = interaction.channel.createMessageComponentCollector({ weaponFilter, time: 30000 });

            const weaponEmbed = new EmbedBuilder()
                .setTitle("Choose Your Weapon")
                .setDescription(
                    `
                    The weapon you choose becomes an extension of yourself, shaping your combat style and abilities on the battlefield. Each carries its own strengths and weaknesses - select wisely based on how you wish to fight. *You can still change weapons later.*

                    **Rusted Sword**
                    ◈A battered but serviceable blade that offers balanced offense and defense
                    ◇Damage depends on your **STR**

                    **Worn Knuckle Wraps**
                    ◈Leather-bound fists that deliver crushing blows at close quarters
                    ◇Damage depends on your **AGI**

                    **Notched Dagger**
                    ◈A quick, light blade perfect for rapid strikes and dirty fighting
                    ◇Damage depends on your **DEX**

                    **Weathered Shortbow**
                    ◈A simple hunting bow with limited range but reliable accuracy
                    ◇Damage depends on your **DEX**

                    **Cracked Oak Wand**
                    ◈A basic magical focus that channels raw arcane energy
                    ◇Damage depends on your **INT**

                    *These humble beginnings will serve you well until you prove yourself worthy of greater arms...*
                    `
                )
            
            const weaponRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('rusted_sword')
                        .setLabel('Rusted Sword')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('worn_knuckle_wraps')
                        .setLabel('Worn Knucle Wraps')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('notched_dagger')
                        .setLabel('Notched Dagger')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('weathered_shortbow')
                        .setLabel('Weathered Shortbow')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('cracked_oak_wand')
                        .setLabel('Creacked Oak Wand')
                        .setStyle(ButtonStyle.Primary),
                );

            await buttonInteraction.followUp({
                embeds: [weaponEmbed],
                components: [weaponRow]
            })

            weaponCollector.on('collect', async (weaponInteraction) => {
                let weapon = null;

                switch (weaponInteraction.customId) {
                    case 'rusted_sword':
                        weapon = 'Rusted Sword';
                        break;
                    case 'worn_knuckle_wraps':
                        weapon = 'Worn Knuckle Wraps';
                        break;
                    case 'notched_dagger':
                        weapon = 'Notched Dagger';
                        break;
                    case 'weathered_shortbow':
                        weapon = 'Weathered Shortbow';
                        break;
                    case 'cracked_oak_wand':
                        weapon = 'Cracked Oak Wand';
                        break;
                    default:
                        return;
                }

                if (weapon) {
                    try {
                        const stats = getRaceBonuses(race);
        
                        const characterData = {
                            id: interaction.user.id,
                            name: characterName,
                            race: race,
                            str: stats.str,
                            con: stats.con,
                            dex: stats.dex,
                            agi: stats.agi,
                            int: stats.int,
                        };

                        const { data: weaponItem, error: weaponError } = await supabase
                            .from('items')
                            .select('id')
                            .eq('name', weapon)
                            .single();
                
                        if (weaponError || !weaponItem) {
                            throw new Error('Weapon not found in database');
                        }
                
                        const { error: charError } = await supabase
                            .from('player')
                            .upsert(characterData, { onConflict: 'id' });
                
                        if (charError) throw charError;
                
                        const { error: invError } = await supabase
                            .from('inventory')
                            .insert([{
                                player_id: interaction.user.id,
                                item_id: weaponItem.id,
                            }]);
                
                        if (invError) throw invError;
                
                        await weaponInteraction.update({
                            content: `✅ **${characterName}**, the **${race}**, you have chosen the **${weapon}**!\n\n**Welcome to the world of Everfall!**`,
                            components: [],
                            embeds: [],
                        });
                
                    } catch (error) {
                        console.error('Character creation error:', error);
                        await weaponInteraction.update({
                            content: "❌ Failed to complete character creation! Please try again.",
                            components: [],
                            embeds: [],
                        });
                    } finally {
                        weaponCollector.stop();
                    }
                }
            });

            weaponCollector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.followUp({ 
                        content: "⌛ You took too long to choose a weapon!", 
                        ephemeral: true 
                    });
                }
            });
        }
    });

    raceCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
            interaction.followUp({ content: "⌛ You took too long to choose a race!", ephemeral: true });
        }
    });
};
