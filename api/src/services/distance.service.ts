
export class DistanceService {
    // Harriet Island Park, St. Paul, MN
    // 151 Water Street, St. Paul, MN 55107
    private static readonly FESTIVAL_COORDS = {
        lat: 44.9351,
        lon: -93.0945
    };

    /**
     * Calculates the distance in miles between the participant's address and the festival site.
     * Uses OpenStreetMap Nominatim API for geocoding.
     */
    static async getDistanceInMiles(address: string, city: string, state: string, zip: string): Promise<number | null> {
        try {
            const fullAddress = `${address}, ${city}, ${state} ${zip}`;
            const coords = await this.geocodeAddress(fullAddress);

            if (!coords) {
                console.warn(`Could not geocode address: ${fullAddress}`);
                return null;
            }

            return this.calculateHaversineDistance(
                coords.lat,
                coords.lon,
                this.FESTIVAL_COORDS.lat,
                this.FESTIVAL_COORDS.lon
            );
        } catch (error) {
            console.error('Error calculating distance:', error);
            return null;
        }
    }

    private static async geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
        try {
            // Using OpenStreetMap Nominatim API
            // Note: This needs a User-Agent header as per Nominatim usage policy
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'VegFestSignup/1.0 (admin@tcvegfest.com)' // Replace with actual requestor info if possible
                }
            });

            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.statusText}`);
            }

            const data = await response.json() as any[];

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lon: parseFloat(data[0].lon)
                };
            }

            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    private static calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const toRad = (value: number) => (value * Math.PI) / 180;
        const R = 3958.8; // Radius of Earth in miles

        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}
