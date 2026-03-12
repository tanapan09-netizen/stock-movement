import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
    const assets = await p.tbl_assets.findMany({
        select: { asset_id: true, asset_name: true, image_url: true },
        take: 15
    });
    assets.forEach(a => console.log(a.asset_id, '|', a.asset_name, '|', JSON.stringify(a.image_url)));
}

main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
