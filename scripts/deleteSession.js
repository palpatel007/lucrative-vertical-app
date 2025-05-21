import prisma from '../app/db.server.js';

async function deleteSession(shopDomain) {
  const result = await prisma.session.deleteMany({
    where: { shop: shopDomain }
  });
  console.log(`Deleted ${result.count} session(s) for shop: ${shopDomain}`);
  process.exit(0);
}

// Replace with your shop domain as needed
const shop = process.argv[2];
if (!shop) {
  console.error('Usage: node scripts/deleteSession.js <shop-domain>');
  process.exit(1);
}
deleteSession(shop); 