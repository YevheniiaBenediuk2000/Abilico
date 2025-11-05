import { supabase } from "./supabaseClient.js";

/**
 * Ensures the OSM place exists in Supabase and returns its UUID.
 * @param {Object} tags - OSM tags object from fetchPlace
 * @param {Object} latlng - { lat, lng } of the place
 */
export async function ensurePlaceExists(tags, latlng) {
  // 🧠 Safely extract OSM identity
  const osmType = tags.osm_type || tags.type || tags.source_type || "unknown";
  const osmId =
      tags.osm_id ||
      tags.id ||
      tags.place_id ||
      `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`;

  const osmKey = `${osmType}/${osmId}`;
  console.log("🧩 ensurePlaceExists for", osmKey);

  const { data: existing, error: selectErr } = await supabase
      .from("places")
      .select("id")
      .eq("osm_id", osmKey)
      .maybeSingle();

  if (selectErr) throw selectErr;
  if (existing) {
    console.log("✅ Found existing place:", existing.id);
    return existing.id;
  }

  const { data, error } = await supabase
      .from("places")
      .insert([
        {
          osm_id: osmKey,
          name: tags.name ?? tags.amenity ?? "Unnamed",
          country: tags["addr:country"] ?? null,
          city: tags["addr:city"] ?? null,
          lat: latlng.lat,
          lon: latlng.lng,
        },
      ])
      .select("id")
      .single();

  if (error) throw error;
  console.log("✅ Inserted new place:", data.id);
  return data.id;
}

/**
 * Handles CRUD operations for reviews in Supabase.
 * @param {"GET"|"POST"} method
 * @param {Object} reviewData
 */
export async function reviewStorage(method = "GET", reviewData) {
  try {
    if (method === "GET") {
      if (!reviewData?.place_id) {
        console.warn("⚠️ reviewStorage(GET) called without place_id");
        return [];
      }

      const { data, error } = await supabase
          .from("reviews")
          .select("*")
          .eq("place_id", reviewData.place_id) // ✅ filter by place
          .order("created_at", { ascending: false });

      if (error) throw error;
      console.log("✅ Reviews loaded for place:", reviewData.place_id, data);
      return data;
    }

    if (method === "POST") {
      console.log("🧩 Preparing to insert review:", reviewData);

      const payload = {
        comment: reviewData.text,
        place_id: reviewData.place_id, // valid UUID from ensurePlaceExists
        rating: reviewData.rating || null,
        image_url: reviewData.image_url || null,
      };

      console.log("📦 Payload sent to Supabase:", payload);

      const { data, error } = await supabase.from("reviews").insert([payload]).select();

      if (error) throw error;
      console.log("✅ Review inserted:", data);
      return data;
    }
  } catch (e) {
    console.error("❌ Review storage failed:", e.message || e);
    return [];
  }
}