
const NEW_DB = {
    url: 'https://ypqxygurmglwjowygpcl.supabase.co/rest/v1',
    key: 'sb_publishable_Rb1YMM3MtK8mjZjpL0ji0g_WDQfi3QI'
};

const services = [
    { id: 2, created_at: "2026-02-16 04:11:09.076466+00", name: "Semipermanente manos ", price: 45000 },
    { id: 3, created_at: "2026-02-16 04:11:48.876241+00", name: "Semi + dipping", price: 55000 },
    { id: 4, created_at: "2026-02-16 04:12:13.877198+00", name: "Barrido poly o acrilico", price: 65000 },
    { id: 5, created_at: "2026-02-16 04:13:00.796271+00", name: "Pies semipermanente ", price: 40000 },
    { id: 6, created_at: "2026-02-16 04:17:02.89962+00", name: "Press on", price: 85000 },
    { id: 7, created_at: "2026-02-16 04:17:27.821378+00", name: "Polygel o acrílico con tips ", price: 90000 },
    { id: 8, created_at: "2026-02-16 04:17:43.385529+00", name: "Pies tradicional", price: 25000 },
    { id: 9, created_at: "2026-02-16 04:18:06.270779+00", name: "Manos tradicional", price: 20000 },
    { id: 10, created_at: "2026-02-16 04:18:22.207377+00", name: "Base rubber ", price: 60000 }
];

async function run() {
    console.log("🚀 Importing services...");
    const response = await fetch(`${NEW_DB.url}/services`, {
        method: 'POST',
        headers: {
            'apikey': NEW_DB.key,
            'Authorization': `Bearer ${NEW_DB.key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(services)
    });

    if (response.ok) {
        console.log("✅ Services imported successfully!");
    } else {
        const error = await response.text();
        console.error("❌ Failed to import services:", error);
    }
}

run();
