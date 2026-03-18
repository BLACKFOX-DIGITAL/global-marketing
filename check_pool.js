const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.count({ where: { ownerId: null } })
  .then(c => console.log('Unassigned leads in pool:', c))
  .catch(e => console.error(e))
  .finally(() => p.$disconnect());
