import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.tbl_assets.findMany({
    select: {
      asset_id: true,
      asset_name: true,
      image_url: true
    },
    take: 10
  });
  console.log(JSON.stringify(assets, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
