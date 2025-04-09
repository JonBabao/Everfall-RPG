import { SlashCommandBuilder } from "discord.js";
import { supabase } from "../../supabase/supabase.js";

export const data = new SlashCommandBuilder()
    .setName('buy')
    .setDescription("Buy items from a shop near you!")
    .addStringOption(option =>
        option.setName('item')
        .setDescription("Enter the name of the item you want to buy")
        .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('quantity')
        .setDescription("Enter how many you want to buy")
        .setRequired(true)
    )

export const execute = async (interaction) => {
    await interaction.deferReply();
    const itemName = interaction.options.getString('item');
    const quantityNum = interaction.options.getInteger('quantity');

    const { data: character, charError } = await supabase
        .from('player')
        .select('id, name, gold')
        .eq('id', interaction.user.id)
        .single()

    if (!character || charError) {
        return interaction.editReply({
            content: "❌ You don't have a character yet! Use `/create` to make one."
        });
    }

    const { data: item, itemError } = await supabase
        .from('items')
        .select('id, name, price')
        .eq('name', itemName)
        .single()

    if (!item || itemError) {
        return interaction.editReply({
            content: "❌ This item doesn't exist!"
        })
    }

    const { data: inventory } = await supabase
        .from('inventory')
        .select('player_id, item_id, quantity, is_equipped')
        .eq('player_id', interaction.user.id)
        .eq('item_id', item.id)
        .single()

    if ((quantityNum*item.price) > character.gold) {
        return interaction.editReply({
            content: "❌ You don't have enough gold!"
        })
    }

    if ((quantityNum*item.price) <= character.gold) {

        const newGold = character.gold - (quantityNum*item.price);

        if (!inventory) {
            const { error: buyError } = await supabase
                .from('inventory')
                .insert({ 
                    player_id: interaction.user.id,
                    item_id: item.id,
                    quantity: quantityNum,
                })

            if (buyError) {
                return interaction.editReply({
                    content: "Error adding to inventory"
                })
            }
        } else {
            const newQuantity = inventory.quantity + quantityNum;

            const { error: buyError } = await supabase
                .from('inventory')
                .update({ quantity: newQuantity })
                .eq('player_id', interaction.user.id)
                .eq('item_id', item.id)

            if (buyError) {
                return interaction.editReply({
                    content: "Error adding to inventory"
                })
            }
        }

        const { error: goldError } = await supabase
            .from('player')
            .update({ gold: newGold })
            .eq('id', interaction.user.id)
            
        if (goldError) {
            return interaction.editReply({
                 content: "Error adding gold"
            })
        }

        return interaction.editReply({
            content: `**${character.name}** bought ${item.name} (x${quantityNum})`
        })
    }
} 