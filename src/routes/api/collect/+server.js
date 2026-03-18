import supabase from '$lib/supabase.js';
import { json } from '@sveltejs/kit';

const updateRequest = async (id, screen_width, screen_height, loading_time, is_touch, is_pointer) => {
    const { error } = await supabase
        .from("requests")
        .update({ screen_width, screen_height, loading_time, is_touch, is_pointer })
        .eq("id", id);

    if(error) throw console.error(`Error on updateRequest: `, error);
    return true;
}

export async function POST({ request }) {
    const body = await request.json();

    const id = body?.id ?? null;
    const screen_width = body?.screen_width ?? null;
    const screen_height = body?.screen_height ?? null;
    const loading_time = body?.loading_time ?? null;
    const is_touch = body?.is_touch ?? false;
    const is_pointer = body?.is_pointer ?? false;
    
    const response = await updateRequest(id, screen_width, screen_height, loading_time, is_touch, is_pointer);
    if(response) return json({ success: true });
    return json({ success: false });
}