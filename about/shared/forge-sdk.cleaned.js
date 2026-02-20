/**
 * FORGE SDK v4.1 // THE NEXUS BRAIN
 * ---------------------------------
 * Universal API Gateway for Zero-Dependency Apps.
 * Handles: Registry, CORS Proxying, Timeout Racing, and Data Normalization.
 */

(function () {

    // 1. THE MASTER REGISTRY (Verified Live Endpoints)
    const API_REGISTRY = {
        // 🌌 SPACE & PHYSICS
        13: { name: "SDSS SkyServer", url: "https://skyserver.sdss.org/dr18/SkyServerWS/SearchTools/SqlSearch?cmd=select%20top%201%20*%20from%20PhotoObj&format=json" },
        43: { name: "NASA Exoplanet", url: "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+top+5+pl_name,pl_rade,pl_orbper+from+ps+where+pl_rade+is+not+null&format=json" },
        47: { name: "JPL Horizons", url: "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='499'&OBJ_DATA='YES'&MAKE_EPHEM='NO'" },
        50: { name: "SDO Solar", url: "https://services.swpc.noaa.gov/json/solar-cycle-indices.json" },
        460: { name: "ISS Tracker", url: "https://api.wheretheiss.at/v1/satellites/25544" },
        462: { name: "ADS-B Exchange", url: "https://opensky-network.org/api/states/all" }, // Critical for Aeris
        
        // 🦁 BIOLOGY
        33: { name: "PDB Structure", url: "https://files.rcsb.org/download/", suffix: ".pdb", type: "text" },
        98: { name: "OBIS Ocean", url: "https://api.obis.org/occurrence?size=10" },
        307: { name: "GBIF Biodiversity", url: "https://api.gbif.org/v1/occurrence/search?limit=5" },
        
        // 🌍 EARTH
        157: { name: "USGS Quakes", url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson" },
        291: { name: "OpenMeteo", url: "https://api.open-meteo.com/v1/forecast?current_weather=true" },
        466: { name: "Volcano Activity", url: "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs?service=wfs&version=2.0.0&request=GetCapabilities", type: "xml" },

        // 💻 TECH & CRYPTO
        347: { name: "CoinGecko", url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd" },
        417: { name: "Blockchain Hash", url: "https://blockchain.info/q/latesthash", type: "text" },
        458: { name: "OSRM Route", url: "https://router.project-osrm.org/route/v1/driving/" }
    };

    // 2. UTILITIES
    const WRAP_PROXY = (url) => `proxy.php?url=${encodeURIComponent(url)}`;

    class ForgeEngine {
        constructor() {
            this.registry = API_REGISTRY;
            this.mode = "ONLINE"; 
            console.log(`[FORGE] System Online. ${Object.keys(this.registry).length} Endpoints Mounted.`);
        }

        /**
         * PRIMARY REQUEST METHOD
         * @param {number} id - API ID from Registry
         * @param {string} params - URL parameters (e.g., "?lat=50")
         */
        async request(id, params = "") {
            const api = this.registry[id];
            if (!api) console.warn(`[FORGE] Unknown ID: ${id}`); return;

            // Construct Target URL
            let target = api.url;
            if (params) target += params;
            if (api.suffix) target += api.suffix;

            console.log(`[FORGE] Dialing ${api.name}...`);

            // The Timeout Race (4 seconds max)
            const timer = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 4000));
            
            // The Fetch
            const fetcher = async () => {
                try {
                    // Auto-Proxy unless specified
                    const finalUrl = api.noProxy ? target : WRAP_PROXY(target);
                    const res = await fetch(finalUrl);
                    if (!res.ok) console.warn(`HTTP ${res.status}`); return;
                    
                    // Parse based on type
                    if (api.type === 'text' || api.type === 'xml') return await res.text();
                    return await res.json();
                } catch (e) {
                    throw e;
                }
            };

            try {
                return await Promise.race([fetcher(), timer]);
            } catch (e) {
                console.warn(`[FORGE] ${api.name} Failed: ${e.message}`);
                throw e; // Bubble up so App can switch to Simulation Mode
            }
        }

        /**
         * DEBUG: Dumps registry to console
         */
        audit() {
            console.table(this.registry);
        }
    }

    // 3. INITIALIZE
    window.Forge = new ForgeEngine();
    window.ForgeEngine = ForgeEngine;

})();