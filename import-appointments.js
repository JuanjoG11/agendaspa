
const NEW_DB = {
    url: 'https://ypqxygurmglwjowygpcl.supabase.co/rest/v1',
    key: 'sb_publishable_Rb1YMM3MtK8mjZjpL0ji0g_WDQfi3QI'
};

const appointments = [
    { id: 1, created_at: "2026-02-16 14:55:55.313895+00", client: "Michel", service: "Press on", date: "2026-02-17", time: "19:30", price: 85000, worker: "mariana", status: "completed" },
    { id: 2, created_at: "2026-02-17 02:07:51.251339+00", client: "Jennifer Arango ", service: "Semi + dipping", date: "2026-02-18", time: "19:00", price: 55000, worker: "manuela", status: "completed" },
    { id: 3, created_at: "2026-02-17 02:08:24.37049+00", client: "Jennifer Arango ", service: "Pies semipermanente ", date: "2026-02-18", time: "19:00", price: 40000, worker: "manuela", status: "completed" },
    { id: 5, created_at: "2026-02-18 19:24:49.190711+00", client: "Alison", service: "Pies semipermanente ", date: "2026-02-27", time: "16:40", price: 40000, worker: "manuela", status: "pending" },
    { id: 6, created_at: "2026-02-18 19:25:18.796132+00", client: "Alison", service: "Semi + dipping", date: "2026-02-27", time: "16:40", price: 55000, worker: "manuela", status: "pending" }
];

async function run() {
    console.log("🚀 Importing appointments...");
    const response = await fetch(`${NEW_DB.url}/appointments`, {
        method: 'POST',
        headers: {
            'apikey': NEW_DB.key,
            'Authorization': `Bearer ${NEW_DB.key}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointments)
    });

    if (response.ok) {
        console.log("✅ Appointments imported successfully!");
    } else {
        const error = await response.text();
        console.error("❌ Failed to import appointments:", error);
    }
}

run();
