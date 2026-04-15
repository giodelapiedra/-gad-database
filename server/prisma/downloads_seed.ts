import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_LOG_COUNT = 200;

const FIRST_NAMES_F = [
  'Maria', 'Ana', 'Josephine', 'Rosario', 'Elena', 'Carmela', 'Divine', 'Rowena',
  'Aileen', 'Angelica', 'Bernadette', 'Catherine', 'Daniela', 'Erika', 'Faye',
  'Grace', 'Hazel', 'Imelda', 'Jessa', 'Kimberly', 'Lourdes', 'Michelle',
  'Nicole', 'Olivia', 'Patricia', 'Queenie', 'Rhea', 'Sheila', 'Therese',
  'Ursula', 'Veronica', 'Wendy', 'Ximena', 'Yolanda', 'Zenaida',
];

const FIRST_NAMES_M = [
  'Juan', 'Jose', 'Antonio', 'Pedro', 'Miguel', 'Carlos', 'Ramon', 'Felipe',
  'Arnel', 'Benjamin', 'Christian', 'Dennis', 'Edgar', 'Francisco', 'Gabriel',
  'Hector', 'Ignacio', 'Jaime', 'Kevin', 'Leonardo', 'Marco', 'Noel',
  'Oscar', 'Pablo', 'Quintin', 'Rodel', 'Samuel', 'Teodoro', 'Ulysses',
  'Victor', 'Wilfredo', 'Xavier', 'Yuri', 'Zaldy',
];

const LAST_NAMES = [
  'Dela Cruz', 'Reyes', 'Santos', 'Garcia', 'Mendoza', 'Ramos', 'Bautista',
  'Villanueva', 'Gonzales', 'Aquino', 'Castillo', 'Flores', 'Hernandez',
  'Diaz', 'Torres', 'Navarro', 'Domingo', 'Salazar', 'Agustin', 'Pascual',
  'Manalo', 'Rivera', 'Lopez', 'Fernandez', 'Marasigan', 'Luna', 'Ocampo',
  'Valdez', 'Macaraeg', 'Sarmiento', 'Panganiban', 'Alcantara', 'Javier',
];

const BARANGAYS_TANAUAN = [
  'Altura Bata', 'Altura Matanda', 'Ambulong', 'Bagbag', 'Bagumbayan',
  'Balele', 'Banadero', 'Bilog-bilog', 'Boot', 'Cale', 'Darasa',
  'Gonzales', 'Hidalgo', 'Janopol', 'Laurel', 'Luyos', 'Malaking Pulo',
  'Maria Paz', 'Mabini', 'Pagaspas', 'Pantay Matanda', 'Poblacion',
  'Sala', 'Santor', 'Santol', 'Sulpoc', 'Trapiche', 'Ulango', 'Wawa',
];

const CITIES_NEARBY = [
  'Tanauan City, Batangas', 'Lipa City, Batangas', 'Sto. Tomas, Batangas',
  'Malvar, Batangas', 'Talisay, Batangas', 'Laurel, Batangas',
  'Balete, Batangas', 'Batangas City', 'Calamba, Laguna', 'Los Baños, Laguna',
];

const ORGANIZATIONS = [
  'LGU Tanauan',
  'DepEd Tanauan',
  'Tanauan City Health Office',
  'Tanauan Institute',
  'La Consolacion College Tanauan',
  'FCU — First Cavite University',
  'DSWD Region IV-A',
  'PCW — Philippine Commission on Women',
  'GABRIELA Women\'s Party',
  'Buklod ng Kababaihan',
  'Barangay Women\'s Association',
  'Rural Improvement Club',
  'Batangas State University',
  'University of Batangas',
  'Sangguniang Kabataan',
  'PNP Women and Children Protection Desk',
  'Tanauan City Hospital',
  'DILG Batangas',
  'Women in Tech PH',
  'Independent / Private',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Weighted random age skewed toward 25-45
function randomAge(): number {
  const r = Math.random();
  if (r < 0.6) return randomInt(25, 45);
  if (r < 0.85) return randomInt(46, 60);
  if (r < 0.95) return randomInt(18, 24);
  return randomInt(61, 75);
}

function randomPhoneNumber(): string {
  const prefix = pick(['0917', '0918', '0919', '0920', '0927', '0928', '0932', '0945', '0949', '0956']);
  const rest = Array.from({ length: 7 }, () => randomInt(0, 9)).join('');
  return `${prefix}${rest}`;
}

// Distribute timestamps across last 30 days, weighted toward recent days
function randomRecentTimestamp(): Date {
  // r^2 skews toward small values (recent = small days-ago)
  const daysAgo = Math.floor(Math.pow(Math.random(), 1.5) * 30);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randomInt(8, 18), randomInt(0, 59), randomInt(0, 59), 0);
  return date;
}

function randomIp(): string {
  return `${randomInt(110, 220)}.${randomInt(1, 254)}.${randomInt(1, 254)}.${randomInt(1, 254)}`;
}

async function main() {
  const [resourceFiles, departmentFiles] = await Promise.all([
    prisma.resourceFile.findMany({
      where: { deletedAt: null },
      select: { id: true, originalName: true },
    }),
    prisma.file.findMany({
      select: { id: true, originalName: true },
    }),
  ]);

  if (resourceFiles.length === 0 && departmentFiles.length === 0) {
    console.error('No files found in database. Upload at least one file before seeding downloads.');
    process.exit(1);
  }

  console.log(`Found ${resourceFiles.length} resource files and ${departmentFiles.length} department files.`);

  // Pick a small "popular" subset to concentrate downloads — makes the Top Files
  // chart more realistic (few files get most downloads).
  const popularResources = resourceFiles.slice(0, Math.min(8, resourceFiles.length));
  const popularDepartment = departmentFiles.slice(0, Math.min(12, departmentFiles.length));

  function pickFile(): { fileType: 'resource' | 'department'; fileId: string; fileName: string } {
    // 40% resources, 60% department (tweak to taste)
    const useResource = Math.random() < 0.4 && resourceFiles.length > 0;
    if (useResource) {
      // 70% of resource downloads come from popular subset
      const pool = Math.random() < 0.7 && popularResources.length > 0 ? popularResources : resourceFiles;
      const f = pick(pool);
      return { fileType: 'resource', fileId: f.id, fileName: f.originalName };
    }
    if (departmentFiles.length === 0) {
      const f = pick(resourceFiles);
      return { fileType: 'resource', fileId: f.id, fileName: f.originalName };
    }
    const pool = Math.random() < 0.7 && popularDepartment.length > 0 ? popularDepartment : departmentFiles;
    const f = pick(pool);
    return { fileType: 'department', fileId: f.id, fileName: f.originalName };
  }

  const logs = Array.from({ length: TARGET_LOG_COUNT }).map(() => {
    const isFemale = Math.random() < 0.62; // skew female for GAD context
    const sex = isFemale ? 'FEMALE' : 'MALE';
    const firstName = isFemale ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
    const lastName = pick(LAST_NAMES);
    const useBarangay = Math.random() < 0.7;
    const location = useBarangay
      ? `Brgy. ${pick(BARANGAYS_TANAUAN)}, Tanauan City, Batangas`
      : pick(CITIES_NEARBY);
    const file = pickFile();

    return {
      fileType: file.fileType,
      fileId: file.fileId,
      fileName: file.fileName,
      name: `${firstName} ${lastName}`,
      location,
      contactNo: randomPhoneNumber(),
      organization: pick(ORGANIZATIONS),
      sex,
      age: randomAge(),
      ip: randomIp(),
      createdAt: randomRecentTimestamp(),
    };
  });

  await prisma.downloadLog.createMany({ data: logs });

  const total = await prisma.downloadLog.count();
  console.log(`Inserted ${logs.length} download logs. Total logs now: ${total}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
