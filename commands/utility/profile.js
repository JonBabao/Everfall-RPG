import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { supabase } from '../../supabase/supabase.js';

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your character\'s profile!')

export const execute = async (interaction) => {

    const { data: character, error: charError } = await supabase
        .from('player')
        .select(`
            name, 
            race,
            char_class,
            level,
            weapon, 
            body_armor, 
            off_hand,
            str, 
            con, 
            int, 
            dex, 
            agi,
            attack_damage,
            magic_damage,
            current_hp,
            max_hp,
            armor,
            magic_armor,
            armor_penetration,
            magic_penetration,
            hit_rate,
            evasion,
            aspd
        `)
        .eq('id', interaction.user.id)
        .single();

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        });
    }

    const profileEmbed = new EmbedBuilder()
        .setTitle(`Player Profile: ${character.name}`)
        .setDescription(`\`\`\`
Health: ${character.current_hp}/${character.max_hp}
Ability Charges: ◈◈
\`\`\``)
        .addFields(
            {
                name: 'Race and Profession',
                value: `\`\`\`
Race: ${character.race || 'Not specified'}
Class: ${character.char_class || 'Not specified'}
Level: ${character.level || 'Not specified'}
\`\`\``,
                inline: false
            },
            {
                name: 'Equipment',
                value: `\`\`\`
Weapon: ${character.weapon || 'None'}
Armor: ${character.body_armor || 'None'}
Off-hand: ${character.off_hand || 'None'}
\`\`\``,
                inline: false
            },
            {
                name: 'Core Stats',
                value: `\`\`\`
Strength: ${character.str}
Constitution: ${character.con}
Intelligence: ${character.int}
Dexterity: ${character.dex}
Agility: ${character.agi}
\`\`\``,
                inline: false
            },
            {
                name: 'Attributes',
                value: `\`\`\`
Attack: ${character.attack_damage}
Magic: ${character.magic_damage}
Armor: ${character.armor}
Magic Armor: ${character.magic_armor}
Armor Pen: ${character.armor_penetration}
Magic Pen: ${character.magic_penetration}
Evasion: ${character.evasion}
Attack Speed: ${character.aspd}
Hit Rate: ${character.hit_rate}
\`\`\``,
                inline: false
            }
        )
        .setColor('#efcc00');   
    
    await interaction.reply({ embeds: [profileEmbed] });
}