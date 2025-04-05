import { supabase } from '../supabase/supabase.js';

export class DropSystem {
    static async getDrops(enemyName) {
        try {
            const { data: enemy, error } = await supabase
                .from('monster')
                .select('drops')
                .eq('name', enemyName)
                .single();

            if (error || !enemy || !enemy.drops) {
                return [];
            }

            const obtainedDrops = [];
            const dropTable = enemy.drops;

            for (const [itemName, dropRate] of Object.entries(dropTable)) {
                if (Math.random() <= dropRate) {
                    obtainedDrops.push(itemName);
                }
            }

            return obtainedDrops;
        } catch (error) {
            console.error('Error getting drops:', error);
            return [];
        }
    }

    static async addToInventory(playerId, itemNames) {
        if (itemNames.length === 0) return;

        try {
            const { data: items, error } = await supabase
                .from('items')
                .select('id, name')
                .in('name', itemNames);
        
            if (error || !items) {
                console.error('Error fetching item IDs:', error);
                return;
            }
        
            const inventoryUpserts = items.map(item => ({
                player_id: playerId,
                item_id: item.id,
                quantity: 1, 
                is_equipped: false
            }));
        
            const { error: upsertError } = await supabase
                .from('inventory')
                .upsert(inventoryUpserts, {
                    onConflict: 'player_id,item_id',
                    ignoreDuplicates: false
                })
                .select(); 
        
            if (upsertError) {
                console.error('Error upserting inventory:', upsertError);
                return;
            }
        
     
            const { error: incrementError } = await supabase.rpc('increment_inventory', {
                player_id: playerId,
                item_ids: items.map(item => item.id),
                amount: 1
            });
        
            if (incrementError) {
                console.error('Error incrementing inventory:', incrementError);
            }
        
            return items.map(item => item.name);
        } catch (error) {
            console.error('Error adding drops to inventory:', error);
            return [];
        }
    }
}