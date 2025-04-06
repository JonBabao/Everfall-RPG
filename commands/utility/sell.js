import { supabase } from '../../supabase/supabase.js';
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('sell')
    .setDescription("Sell your items to the shop!")
    .addStringOption(option =>
        option.setName('item')
        .setDescription("Enter item name")
        .setRequired(true)
    )
    .addIntegerOption(option =>
        option.setName('quantity')
            .setDescription("How many would you like to sell?")
            .setRequired(true)
    );

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

    const { data: inventory, inventoryError } = await supabase
        .from('inventory')
        .select('player_id, item_id, quantity, is_equipped')
        .eq('player_id', interaction.user.id)
        .eq('item_id', item.id)
        .single()

    if (!inventory || inventoryError) {
        return interaction.editReply({
            content: "❌ You don't have this item!"
        })
    }

    if (inventory.is_equipped) {
        return interaction.editReply({
            content: "❌ You can't sell an equipped item!"
        })
    }

    if (quantityNum > inventory.quantity) {
        return interaction.editReply({
            content: `❌ You only have ${item.name} x${inventory.quantity}!`
        })
    }
    const newQuantity = inventory.quantity - quantityNum;
    const gainedGold = quantityNum * item.price;
    const currentGold = character.gold;
    const newGold = currentGold + gainedGold;

    console.log(`New Quantity: ${inventory.quantity} - ${quantityNum} = ${newQuantity}`);
    console.log(`Current Gold: ${character.gold}`);
    console.log(`Gained Gold: ${quantityNum} * ${item.price} = ${gainedGold}`);
    console.log(`New Gold: ${currentGold} + ${gainedGold} = ${newGold}`);

    if (newQuantity > 0) {
        console.log("subtracting");
        const { sellError } = await supabase
            .from('inventory')
            .update({ quantity: newQuantity })
            .eq('player_id', interaction.user.id)
            .eq('item_id', item.id)

        if (sellError) {
            return interaction.editReply({
                content: "There is an error while selling your item."
            })
        }    
    } else {
        console.log("deleting");
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

    const { goldError } = await supabase
        .from('player')
        .update({ gold: newGold })
        .eq('id', interaction.user.id)

    if (goldError) {
        return interaction.editReply({
            content: "There is an error while adding gold."
        })
    }

    await interaction.editReply({
        content: `✅ Successfully sold ${itemName} (x${quantityNum}) for ${gainedGold} Gold!`
    });
}