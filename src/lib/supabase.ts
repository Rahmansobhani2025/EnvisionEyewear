import { createClient } from '@supabase/supabase-js';

// Clean up URL to ensure no double slashes or trailing slashes that might cause 404s
const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize with placeholders if missing to avoid immediate crash, 
// but log a warning so the user knows why it's not working.
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment variables in the Settings menu.');
}

// createClient will throw if url is empty, so we provide a dummy valid-looking URL if missing
// to allow the app to boot, while actual calls will fail gracefully or return empty data.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);

export interface Eyeglass {
  id: string;
  name: string;
  model: string;
  image_url: string;
  description: string;
  frame_type: string;
  bridge_width: number;
  lens_width: number;
  temple_length: number;
  suitable_face_shapes: string[];
}

export async function getInventory(): Promise<Eyeglass[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select('*');

  if (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }

  return data as Eyeglass[];
}

export async function saveAnalysis(results: any) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("No authenticated user found");
    }

    console.log('Attempting to save for user:', user.id);
    console.log('Data payload:', results);

    const ipdValue = parseFloat(results.measurements?.ipd_mm?.toString() || results.measurements?.ipd?.toString() || '0');

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.display_name || null,
        last_ipd_result: ipdValue,
        ipd_measurement: ipdValue,
        face_shape: results.face_shape || results.faceGeometry,
        preferred_style: results.styleProfile?.aesthetic || null,
        face_analysis_raw: results
      });
    
    if (error) {
      console.error('Supabase Error:', error.message);
      alert(`Save failed: ${error.message}`);
      throw error;
    }
    
    console.log('Save successful:', data);
    return data;
  } catch (err: any) {
    console.error('Catch error saving analysis:', err);
    if (!err.message.includes("Save failed")) {
      alert(`Save failed: ${err.message}`);
    }
    throw err;
  }
}

export async function getLatestAnalysis(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('face_analysis_raw')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error('Error fetching latest analysis:', error);
    return null;
  }

  return data?.face_analysis_raw;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function signupUser(email: string, password: string, name?: string, phone?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
        phone: phone,
      },
    },
  });

  if (error) throw error;

  // If signup is successful and we have extra data, update the profile
  // Note: We ONLY include fields that exist in the restricted profiles schema
  if (data.user && name) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: name
      });
    
    if (profileError) {
      console.warn('Error upserting profile metadata:', profileError.message);
    }
  }

  return data.user;
}

export async function saveRecommendations(userId: string, recommendations: any[]) {
  const { error } = await supabase
    .from('recommendations')
    .insert(recommendations.map(frame => ({
      user_id: userId,
      frame_name: frame.name,
      model_name: frame.model,
      image_url: frame.imageUrl,
      reasoning: frame.scientificRationale,
      frame_style: frame.frameStyle || null,
      frame_color: frame.frameColor || null,
      match_score: frame.matchScore || null,
      front_size: frame.frontSize || null,
      bridge_size: frame.bridgeSize || null,
      temple_length: frame.templeLength || null,
      frame_material: frame.frameMaterial || null,
      brand_name: frame.brandName || null,
      price: frame.price || null,
      discounted_price: frame.discountedPrice || null
    })));

  if (error) {
    console.error('Error saving recommendations:', error);
    throw error;
  }
}
