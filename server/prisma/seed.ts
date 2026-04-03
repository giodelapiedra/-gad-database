import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@gad.gov.ph' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@gad.gov.ph',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Seed complete. Login: admin@gad.gov.ph / Admin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
