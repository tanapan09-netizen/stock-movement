const { config } = require('dotenv');
config();
const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

p.tbl_assets.findMany({
    select: { asset_id: true, asset_name: true, image_url: true },
    take: 15
}).then(assets => {
    assets.forEach(a => console.log(a.asset_id, '|', a.asset_name, '|', JSON.stringify(a.image_url)));
    process.exit(0);
}).catch(e => { console.error(e.message); process.exit(1); });
