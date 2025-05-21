const fetchSuggestions = async (query) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=100`
    );
    const data = await response.json();
    console.log("Suggestions:", data);
    return data;
  } catch (error) {
    console.error("Search error:", error);
  }
};
