import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase.js";

export const data = new SlashCommandBuilder()
    .setName('consume')
    .setDescription("Consume an item in your inventory!")
    .addStringOption(option =>
        option.setName('item')
        .setDescription('Enter the name of the item you want to consume!')
        .setRequired(true)
    )
    
export const execute = async (interaction) => {
    await interaction.deferReply();
    const itemName = interaction.options.getString('item');

    const { data: character, charError } = await supabase
        .from('player')
        .select('name, current_hp, max_hp')
        .eq('id', interaction.user.id)
        .single()

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        })
    }

    const { data: item, itemError } = await supabase
        .from('items')
        .select('id, name, description, type, effect, attributes')
        .eq('name', itemName)
        .single()

    if (!item || itemError) {
        return interaction.editReply({
            content: "❌ This item doesn't exist!"
        })
    }

    if (item.type != "consumable") {
        return interaction.editReply({
            content: `❌ **${item.name}** cannot be consumed!`
        })
    }

    const { data: inventory, invError } = await supabase
        .from('inventory')
        .select('item_id, quantity')
        .eq('player_id', interaction.user.id)
        .eq('item_id', item.id)
        .single()

    if (!inventory || invError) {
        return interaction.editReply({
            content: `❌ You don't have **${item.name}**!`
        })
    }

    const currentHp = character.current_hp;
    const maxHp = character.max_hp;

    let quantity = inventory.quantity;
    const newQuantity = quantity - 1;

    if (currentHp == maxHp) {
        return interaction.editReply({
            content: `Your HP is already full! **${item.name}** was not consumed.`
        })
    }

    if (currentHp < maxHp) {
        let healAmount = item.attributes.current_hp;
        let newCurrentHp = currentHp + healAmount;

        if (newCurrentHp > maxHp) {
            healAmount = maxHp - currentHp;
            newCurrentHp = maxHp;
        }

        if (newQuantity > 1) {
            const { error: consumeError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('item_id', item.id)

            if (consumeError) {
                return interaction.editReply({
                    content: `❌ There was an error while consuming **${item.name}**!`
                })
            }
            
        } else {
            const { deleteError } = await supabase
                .from('inventory')
                .delete()
                .eq('player_id', interaction.user.id)
                .eq('item_id', item.id)
        
            if (deleteError) {
                return interaction.editReply({
                    content: "There is an error while deleting the row."
                })
            }  
        }

        const { error: effectError } = await supabase
            .from('player')
            .update({ current_hp: newCurrentHp })
            .eq('id', interaction.user.id)

        if (effectError) {
            return interaction.editReply({
                content: `❌ There was an error healing **${character.name}**`
            })
        }

        const consumeEmbed = new EmbedBuilder()
            .setColor('#00FF00') 
            .setTitle('🫙 Item Consumed!')
            .setDescription(
                `**${character.name}** consumes **${item.name}**!\n\n` +
                `**Description:** A small bottle containing a deep crimson fluid. The liquid has a sharp medicinal aroma.\n\n` +
                `**Health:** ${newCurrentHp}/${maxHp} (${healAmount > 0 ? '↑' : '↓'}${healAmount})\n` +
                `**${item.name}** (Remaining: ${newQuantity})`
            )
            .setFooter({ text: '/consume [item]' })

        await interaction.editReply({ embeds: [consumeEmbed] });
    }
}