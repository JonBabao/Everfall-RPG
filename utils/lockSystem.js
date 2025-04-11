import { supabase } from '../supabase/supabase.js';

const activeLocks = new Map();

export async function lockUser(userId, reason, durationMs) {
    const expires = Date.now() + durationMs;
    
    activeLocks.set(userId, { 
        reason, 
        expires,
        timeout: setTimeout(() => activeLocks.delete(userId), durationMs)
    });

    await supabase
        .from('user_locks')
        .upsert({
            user_id: userId,
            reason,
            expires_at: new Date(expires).toISOString()
        });
}

export async function unlockUser(userId) {
    const lock = activeLocks.get(userId);
    if (lock) clearTimeout(lock.timeout);
    activeLocks.delete(userId);


    await supabase
        .from('user_locks')
        .delete()
        .eq('user_id', userId);
}

export async function isUserLocked(userId) {
    const memoryLock = activeLocks.get(userId);
    if (memoryLock) return memoryLock;

    const { data: dbLock } = await supabase
        .from('user_locks')
        .select()
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (dbLock) {
        return {
            reason: dbLock.reason,
            expires: new Date(dbLock.expires_at).getTime()
        };
    }

    return null;
}

export async function initialize() {
    await supabase
        .from('user_locks')
        .delete()
        .lt('expires_at', new Date().toISOString());
}