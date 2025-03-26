import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { supabase } from '../../supabase/supabase.js'

export const data = new SlashCommandBuilder()
    .setName('bag')
    .setDescription('Check your inventory!')

export const execute = async (interaction) => {

    const { data: character, error: charError } = await supabase
        .from('player')
        .select('id, name')
        .eq('id', interaction.user.id)
        .single()

    if (charError || !character) {
        return interaction.reply({
            content: "❌ You don't have a character yet! Use `/create` to make one.",
            ephemeral: true
        })
    }

    const { data: inventory, error } = await supabase
        .from('inventory')
        .select(`
            quantity,
            is_equipped,
            items (name, type)
        `)
        .eq('player_id', interaction.user.id)
    
    if (error) {
        return interaction.reply ({
            content: "❌ Failed to fetch your inventory!",
            ephemeral: true
        })
    }

    if (inventory.length == 0) {
        return interaction.reply ({
            content: "Your inventory is empty!",
            ephemeral: true
        })
    }

    const embed = new EmbedBuilder()
        .setTitle(`${character.name}'s Inventory`)
        .setColor(0x00AE86)

    const itemsByType = {}
    inventory.forEach(entry => {
        const type = entry.items.type
        if (!itemsByType[type]) itemsByType[type] = []
        itemsByType[type].push(entry)
    })

    Object.entries(itemsByType).forEach(([type, items]) => {
        const value = items.map(item => {
            const equipped = item.is_equipped ? ' [EQUIPPED]' : ''
            return `• ${item.items.name}${equipped} (x${item.quantity})`
        }).join('\n')
        
        embed.addFields({ name: type.toUpperCase(), value })
    })

    await interaction.reply({ embeds: [embed] })
}