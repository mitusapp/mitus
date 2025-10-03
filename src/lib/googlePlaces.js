const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/**
 * Obtiene predicciones de autocompletado de Google Places (API New)
 */
export async function fetchPredictions(input) {
  if (!input) return [];

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places:autocomplete?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({ input }),
      }
    );

    const data = await res.json();
    console.log("Autocomplete response:", data);

    return (
      data.suggestions?.map((s) => ({
        placeId: s.placePrediction?.placeId,
        description: s.placePrediction?.text?.text,
      })) || []
    );
  } catch (err) {
    console.error("fetchPredictions error:", err);
    return [];
  }
}

/**
 * Obtiene detalles de un lugar a partir del placeId
 */
export async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?key=${API_KEY}&fields=id,displayName,formattedAddress,location,addressComponents`,
      {
        headers: {
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,addressComponents",
        },
      }
    );

    const data = await res.json();
    console.log("Place details response:", data);

    return {
      id: data.id,
      name: data.displayName?.text,
      formattedAddress: data.formattedAddress,
      location: data.location,
      addressComponents: data.addressComponents,
    };
  } catch (err) {
    console.error("fetchPlaceDetails error:", err);
    return null;
  }
}
