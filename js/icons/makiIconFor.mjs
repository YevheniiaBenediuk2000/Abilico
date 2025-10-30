const makiUrl = (name) =>
    new URL(`../../assets/icons/maki/${encodeURIComponent(name)}.svg`, import.meta.url).href;

const TAG_PRIORITY = [
    "amenity", "shop", "tourism", "leisure", "healthcare",
    "office", "craft", "historic", "man_made", "military", "sport",
];

// small helper so "fast_food" → "fast-food", etc.
function variants(v) {
    const x = String(v || "").trim();
    const out = new Set([
        x, x.toLowerCase(),
        x.replace(/_/g, "-").toLowerCase(),
        x.replace(/-/g, "_").toLowerCase(),
    ]);
    if (x === "fast_food") out.add("fast-food");
    if (x === "ice_cream") out.add("ice-cream");
    return [...out];
}

// Base mapping: OSM amenity/shop/etc ⇒ maki icon name
const AMENITY_TO_MAKI = {
    // health
    pharmacy: "pharmacy", hospital: "hospital", clinic: "hospital",
    doctors: "doctor", dentist: "dentist", blood_bank: "blood-bank",
    // money/admin/safety
    bank: "bank", atm: "bank", bureau_de_change: "bank",
    post_office: "post", parcel_locker: "post", police: "police",
    courthouse: "town-hall", townhall: "town-hall",
    // food & drink
    cafe: "cafe", restaurant: "restaurant", fast_food: "fast-food",
    bar: "bar", pub: "beer", food_court: "restaurant",
    // water & toilets
    toilets: "toilet", drinking_water: "drinking-water", water_point: "drinking-water",
    // mobility
    fuel: "fuel", charging_station: "charging-station",
    car_rental: "car-rental", parking: "parking",
    parking_entrance: "parking-garage", parking_space: "parking",
    // learning & culture
    library: "library", theatre: "theatre", cinema: "cinema",
    arts_centre: "art-gallery", marketplace: "shop",
    university: "college", college: "college", school: "school",
    kindergarten: "school", childcare: "school",
    // worship
    place_of_worship: "place-of-worship", monastery: "religious-christian",
    // civic
    fire_station: "fire-station", bus_station: "bus",
    // social
    social_facility: "heart", veterinary: "veterinary", coworking_space: "commercial",
    // misc
    recycling: "recycling", waste_disposal: "waste-basket",
    car_wash: "car", vehicle_inspection: "car-repair",
    bicycle_rental: "bicycle-share", bicycle_repair_station: "bicycle",
    nightclub: "nightclub", internet_cafe: "mobile-phone",
};

const SHOP_TO_MAKI = {
    supermarket: "grocery",
    convenience: "convenience",
    bakery: "bakery",
    clothes: "clothing-store",
    hardware: "hardware",
    jewelry: "jewelry-store",
    florist: "florist",
    furniture: "furniture",
    alcohol: "alcohol-shop",
    // fallback handled below
};

const TOURISM_TO_MAKI = {
    hotel: "lodging",
    attraction: "attraction",
    museum: "museum",
    gallery: "art-gallery",
    zoo: "zoo",
    theme_park: "amusement-park",
    aquarium: "aquarium",
    viewpoint: "viewpoint",
};

const LEISURE_TO_MAKI = {
    park: "park",
    playground: "playground",
    pitch: "pitch",
    stadium: "stadium",
    swimming_pool: "swimming",
    fitness_centre: "fitness-centre",
    dog_park: "dog-park",
    marina: "harbor",
    ice_rink: "skiing", // closest generic
    skate_park: "skateboard",
};

const SPORT_TO_MAKI = {
    soccer: "soccer", tennis: "tennis", basketball: "basketball",
    baseball: "baseball", golf: "golf", volleyball: "volleyball",
    table_tennis: "table-tennis", cricket: "cricket",
};

// refine worship icon by religion=*
function refineByReligion(base, tags) {
    if (base !== "place-of-worship") return base;
    const relMap = {
        christian: "religious-christian",
        jewish: "religious-jewish",
        muslim: "religious-muslim",
        buddhist: "religious-buddhist",
        shinto: "religious-shinto",
    };
    return relMap[tags.religion] || base;
}

function categoryFallback(key) {
    return (
        (key === "shop" && "shop") ||
        (key === "tourism" && "attraction") ||
        (key === "leisure" && "park") ||
        (key === "healthcare" && "hospital") ||
        (key === "sport" && "pitch") ||
        "information"
    );
}

// Public: returns a full URL to the best icon for given OSM tags
export function iconFor(tags = {}) {
    for (const key of TAG_PRIORITY) {
        const raw = tags[key];
        if (!raw) continue;

        // 1) Direct amenity mapping
        if (key === "amenity") {
            // exact
            if (AMENITY_TO_MAKI[raw]) {
                const name =
                    raw === "place_of_worship"
                        ? refineByReligion("place-of-worship", tags)
                        : AMENITY_TO_MAKI[raw];
                return makiUrl(name);
            }
            // try hyphen/underscore variants present in Maki set
            for (const v of variants(raw)) {
                if (AMENITY_TO_MAKI[v]) return makiUrl(AMENITY_TO_MAKI[v]);
            }
        }

        // 2) Shops
        if (key === "shop") {
            for (const v of variants(raw)) {
                if (SHOP_TO_MAKI[v]) return makiUrl(SHOP_TO_MAKI[v]);
            }
            return makiUrl("shop");
        }

        // 3) Tourism
        if (key === "tourism") {
            for (const v of variants(raw)) {
                if (TOURISM_TO_MAKI[v]) return makiUrl(TOURISM_TO_MAKI[v]);
            }
            return makiUrl("attraction");
        }

        // 4) Leisure
        if (key === "leisure") {
            for (const v of variants(raw)) {
                if (LEISURE_TO_MAKI[v]) return makiUrl(LEISURE_TO_MAKI[v]);
            }
            return makiUrl("park");
        }

        // 5) Healthcare=* (rare, but present)
        if (key === "healthcare") {
            if (/^hospital|clinic$/i.test(raw)) return makiUrl("hospital");
            return makiUrl("pharmacy");
        }

        // 6) Sports
        if (key === "sport") {
            for (const v of variants(raw)) {
                if (SPORT_TO_MAKI[v]) return makiUrl(SPORT_TO_MAKI[v]);
            }
            return makiUrl("pitch");
        }

        // 7) Fallback per category
        return makiUrl(categoryFallback(key));
    }

    // Last resort
    return makiUrl("information");
}