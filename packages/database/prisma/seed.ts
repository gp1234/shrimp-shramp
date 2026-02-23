import { PrismaClient } from "../generated/prisma";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🦐 Seeding Shrampi database...\n");

  // ──────────────────────────────────────────
  // 1. Roles
  // ──────────────────────────────────────────
  const roles = await Promise.all(
    ["Admin", "Farm Manager", "Supervisor", "Operator", "Viewer"].map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} role` },
      }),
    ),
  );
  console.log(`✅ Created ${roles.length} roles`);

  // ──────────────────────────────────────────
  // 2. Permissions
  // ──────────────────────────────────────────
  const resources = [
    "farms",
    "ponds",
    "cycles",
    "feeding",
    "water_quality",
    "inventory",
    "personnel",
    "financial",
    "users",
    "settings",
  ];
  const actions = ["create", "read", "update", "delete"];
  const permissions = [];
  for (const resource of resources) {
    for (const action of actions) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action },
      });
      permissions.push(perm);
    }
  }
  console.log(`✅ Created ${permissions.length} permissions`);

  // Assign all permissions to Admin role
  const adminRole = roles.find((r) => r.name === "Admin")!;
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log("✅ Assigned all permissions to Admin role");

  // ──────────────────────────────────────────
  // 2b. Company
  // ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000099" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000099",
      name: "Shrampi Corp",
    },
  });
  console.log(`✅ Created company: ${company.name}`);

  // ──────────────────────────────────────────
  // 3. Users
  // ──────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@shrampi.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      name: "System Admin",
      companyId: company.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  const managerRole = roles.find((r) => r.name === "Farm Manager")!;
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@shrampi.com" },
    update: {},
    create: {
      email: "manager@shrampi.com",
      passwordHash: await bcrypt.hash("Manager123!", 10),
      name: "Carlos Rodriguez",
      companyId: company.id,
    },
  });
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: managerUser.id, roleId: managerRole.id },
    },
    update: {},
    create: { userId: managerUser.id, roleId: managerRole.id },
  });
  console.log("✅ Created admin and manager users");

  // ──────────────────────────────────────────
  // 4. Farms
  // ──────────────────────────────────────────
  const farm1 = await prisma.farm.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      companyId: company.id,
      name: "Shrampi Ocean Farm",
      location: "Guayaquil, Ecuador",
      totalArea: 25.5,
      waterSource: "Pacific Ocean inlet",
    },
  });

  const farm2 = await prisma.farm.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      companyId: company.id,
      name: "Costa Verde Farm",
      location: "Machala, Ecuador",
      totalArea: 18.3,
      waterSource: "Gulf of Guayaquil",
    },
  });
  console.log(`✅ Created 2 farms: ${farm1.name}, ${farm2.name}`);

  // Use farm1 for the rest of the seed data
  const farm = farm1;

  // ──────────────────────────────────────────
  // 5. Ponds
  // ──────────────────────────────────────────
  const pondData = [
    {
      code: "P-01",
      name: "Pond Alpha",
      area: 4.8,
      depth: 1.2,
      status: "ACTIVE" as const,
    },
    {
      code: "P-02",
      name: "Pond Beta",
      area: 3.5,
      depth: 1.1,
      status: "ACTIVE" as const,
    },
    {
      code: "P-03",
      name: "Pond Gamma",
      area: 5.2,
      depth: 1.3,
      status: "ACTIVE" as const,
    },
    {
      code: "P-04",
      name: "Pond Delta",
      area: 4.0,
      depth: 1.2,
      status: "PREPARING" as const,
    },
    {
      code: "P-05",
      name: "Pond Epsilon",
      area: 3.8,
      depth: 1.0,
      status: "MAINTENANCE" as const,
    },
    {
      code: "P-06",
      name: "Pond Zeta",
      area: 4.2,
      depth: 1.2,
      status: "INACTIVE" as const,
    },
  ];

  const ponds = [];
  for (const pd of pondData) {
    const pond = await prisma.pond.upsert({
      where: { code: pd.code },
      update: {},
      create: {
        farmId: farm.id,
        code: pd.code,
        name: pd.name,
        area: pd.area,
        depth: pd.depth,
        waterType: "BRACKISH",
        capacity: Math.round(pd.area * 10000 * 150), // 150 PL/m²
        status: pd.status,
      },
    });
    ponds.push(pond);
  }
  console.log(`✅ Created ${ponds.length} ponds`);

  // ──────────────────────────────────────────
  // 6. Cycles
  // ──────────────────────────────────────────
  const cycle1 = await prisma.cycle.create({
    data: {
      pondId: ponds[0]!.id,
      name: "Cycle 2024-Q3",
      species: "Litopenaeus vannamei",
      status: "GROWING",
      startDate: new Date("2024-07-15"),
      expectedEndDate: new Date("2024-10-15"),
      initialStock: 720000,
      stockDensity: 150,
      targetWeight: 30,
    },
  });

  const cycle2 = await prisma.cycle.create({
    data: {
      pondId: ponds[1]!.id,
      name: "Cycle 2024-Q3-B",
      species: "Litopenaeus vannamei",
      status: "GROWING",
      startDate: new Date("2024-08-01"),
      expectedEndDate: new Date("2024-11-01"),
      initialStock: 525000,
      stockDensity: 150,
      targetWeight: 28,
    },
  });

  const cycle3 = await prisma.cycle.create({
    data: {
      pondId: ponds[2]!.id,
      name: "Cycle 2024-Q2",
      species: "Litopenaeus vannamei",
      status: "COMPLETED",
      startDate: new Date("2024-04-01"),
      actualEndDate: new Date("2024-07-10"),
      initialStock: 780000,
      stockDensity: 150,
      targetWeight: 32,
    },
  });
  console.log("✅ Created 3 production cycles");

  // ──────────────────────────────────────────
  // 7. Stocking Records
  // ──────────────────────────────────────────
  await prisma.stockingRecord.createMany({
    data: [
      {
        cycleId: cycle1.id,
        date: new Date("2024-07-15"),
        quantity: 720000,
        averageWeight: 0.01,
        source: "Pacific Hatchery",
        plDensity: 150,
        cost: 3600,
      },
      {
        cycleId: cycle2.id,
        date: new Date("2024-08-01"),
        quantity: 525000,
        averageWeight: 0.01,
        source: "Guayaquil Larvae Co",
        plDensity: 150,
        cost: 2625,
      },
      {
        cycleId: cycle3.id,
        date: new Date("2024-04-01"),
        quantity: 780000,
        averageWeight: 0.01,
        source: "Pacific Hatchery",
        plDensity: 150,
        cost: 3900,
      },
    ],
  });
  console.log("✅ Created stocking records");

  // ──────────────────────────────────────────
  // 8. Feed Types
  // ──────────────────────────────────────────
  const feed1 = await prisma.feedType.create({
    data: {
      name: "Masterline EXT #5 BI",
      brand: "Masterline",
      proteinPct: 35,
      size: "2.5mm",
      costPerKg: 1.21,
    },
  });
  const feed2 = await prisma.feedType.create({
    data: {
      name: "Optiline AD EXT #5",
      brand: "Optiline",
      proteinPct: 38,
      size: "2.0mm",
      costPerKg: 1.35,
    },
  });
  const feed3 = await prisma.feedType.create({
    data: {
      name: "NutraStart Plus",
      brand: "NutraStart",
      proteinPct: 42,
      size: "1.0mm",
      costPerKg: 2.1,
    },
  });
  console.log("✅ Created 3 feed types");

  // ──────────────────────────────────────────
  // 9. Feeding Logs (sample 14 days for cycle1)
  // ──────────────────────────────────────────
  const feedingLogs = [];
  for (let day = 0; day < 14; day++) {
    const date = new Date("2024-07-15");
    date.setDate(date.getDate() + day);
    feedingLogs.push(
      {
        pondId: ponds[0]!.id,
        cycleId: cycle1.id,
        feedTypeId: feed1.id,
        date,
        quantity: 80 + day * 5,
        mealNumber: 1,
      },
      {
        pondId: ponds[0]!.id,
        cycleId: cycle1.id,
        feedTypeId: feed2.id,
        date,
        quantity: 60 + day * 3,
        mealNumber: 2,
      },
    );
  }
  await prisma.feedingLog.createMany({ data: feedingLogs });
  console.log(`✅ Created ${feedingLogs.length} feeding logs`);

  // ──────────────────────────────────────────
  // 10. Water Quality Logs (sample 14 days for pond Alpha)
  // ──────────────────────────────────────────
  const waterLogs = [];
  for (let day = 0; day < 14; day++) {
    const date = new Date("2024-07-15");
    date.setDate(date.getDate() + day);
    waterLogs.push({
      pondId: ponds[0]!.id,
      date,
      temperature: 28 + Math.random() * 3,
      ph: 7.5 + Math.random() * 0.8,
      dissolvedOxygen: 5.5 + Math.random() * 2,
      salinity: 15 + Math.random() * 5,
      ammonia: 0.01 + Math.random() * 0.04,
      recordedBy: "Carlos Rodriguez",
    });
  }
  await prisma.waterQualityLog.createMany({ data: waterLogs });
  console.log(`✅ Created ${waterLogs.length} water quality logs`);

  // ──────────────────────────────────────────
  // 11. Mortality Records
  // ──────────────────────────────────────────
  await prisma.mortalityRecord.createMany({
    data: [
      {
        cycleId: cycle1.id,
        date: new Date("2024-07-20"),
        count: 1500,
        cause: "Natural",
      },
      {
        cycleId: cycle1.id,
        date: new Date("2024-07-25"),
        count: 800,
        cause: "Water quality",
      },
      {
        cycleId: cycle1.id,
        date: new Date("2024-08-01"),
        count: 500,
        cause: "Unknown",
      },
    ],
  });
  console.log("✅ Created mortality records");

  // ──────────────────────────────────────────
  // 12. Harvest Record (completed cycle)
  // ──────────────────────────────────────────
  await prisma.harvestRecord.create({
    data: {
      cycleId: cycle3.id,
      date: new Date("2024-07-10"),
      quantity: 569400, // 73% survival
      totalWeight: 41962,
      averageWeight: 25.27,
      pricePerUnit: 1.5,
      totalRevenue: 61119,
      survivalRate: 73,
      harvestType: "full",
      buyer: "Pacific Seafood Exports",
    },
  });
  console.log("✅ Created harvest record");

  // ──────────────────────────────────────────
  // 13. Expense Categories
  // ──────────────────────────────────────────
  const categories = await Promise.all(
    [
      "Labor",
      "Feed",
      "Chemicals",
      "Energy",
      "Equipment",
      "Maintenance",
      "Transport",
      "Other",
    ].map((name) =>
      prisma.expenseCategory.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  console.log(`✅ Created ${categories.length} expense categories`);

  // ──────────────────────────────────────────
  // 14. Production Costs (for completed cycle)
  // ──────────────────────────────────────────
  const feedCat = categories.find((c) => c.name === "Feed")!;
  const laborCat = categories.find((c) => c.name === "Labor")!;
  const energyCat = categories.find((c) => c.name === "Energy")!;

  await prisma.productionCost.createMany({
    data: [
      {
        cycleId: cycle3.id,
        categoryId: feedCat.id,
        description: "Feed supply for entire cycle",
        amount: 32000,
        date: new Date("2024-07-10"),
      },
      {
        cycleId: cycle3.id,
        categoryId: laborCat.id,
        description: "Labor for 3 months",
        amount: 8500,
        date: new Date("2024-07-10"),
      },
      {
        cycleId: cycle3.id,
        categoryId: energyCat.id,
        description: "Electricity and diesel",
        amount: 5071.49,
        date: new Date("2024-07-10"),
      },
    ],
  });
  console.log("✅ Created production costs");

  // ──────────────────────────────────────────
  // 15. Revenue Record
  // ──────────────────────────────────────────
  await prisma.revenueRecord.create({
    data: {
      cycleId: cycle3.id,
      description: "Full harvest sale to Pacific Seafood Exports",
      amount: 61118.98,
      date: new Date("2024-07-12"),
      source: "Pacific Seafood Exports",
    },
  });
  console.log("✅ Created revenue record");

  // ──────────────────────────────────────────
  // 16. Inventory Items
  // ──────────────────────────────────────────
  await prisma.inventoryItem.createMany({
    data: [
      {
        name: "Masterline EXT #5 BI (50kg bags)",
        category: "FEED",
        unit: "bag",
        currentStock: 45,
        minimumStock: 10,
        costPerUnit: 60.5,
      },
      {
        name: "Calcium Hypochlorite",
        category: "CHEMICAL",
        unit: "kg",
        currentStock: 120,
        minimumStock: 50,
        costPerUnit: 3.2,
      },
      {
        name: "Probiotics Blend",
        category: "CHEMICAL",
        unit: "L",
        currentStock: 25,
        minimumStock: 10,
        costPerUnit: 18.5,
      },
      {
        name: "Aerator Paddle",
        category: "EQUIPMENT",
        unit: "unit",
        currentStock: 8,
        minimumStock: 2,
        costPerUnit: 450,
      },
      {
        name: "PVC Pipe 4 inch",
        category: "SPARE_PART",
        unit: "meter",
        currentStock: 30,
        minimumStock: 10,
        costPerUnit: 5.8,
      },
    ],
  });
  console.log("✅ Created inventory items");

  // ──────────────────────────────────────────
  // 17. Staff
  // ──────────────────────────────────────────
  await prisma.staff.createMany({
    data: [
      {
        farmId: farm.id,
        firstName: "Carlos",
        lastName: "Rodriguez",
        position: "Farm Manager",
        phone: "+593-99-1234567",
        hireDate: new Date("2022-01-15"),
      },
      {
        farmId: farm.id,
        firstName: "Maria",
        lastName: "Gonzalez",
        position: "Supervisor",
        phone: "+593-99-2345678",
        hireDate: new Date("2022-06-01"),
      },
      {
        farmId: farm.id,
        firstName: "Pedro",
        lastName: "Alvarez",
        position: "Operator",
        phone: "+593-99-3456789",
        hireDate: new Date("2023-03-10"),
      },
      {
        farmId: farm.id,
        firstName: "Ana",
        lastName: "Martinez",
        position: "Operator",
        phone: "+593-99-4567890",
        hireDate: new Date("2023-08-20"),
      },
      {
        farmId: farm.id,
        firstName: "Luis",
        lastName: "Torres",
        position: "Operator",
        phone: "+593-99-5678901",
        hireDate: new Date("2024-01-05"),
      },
    ],
  });
  console.log("✅ Created 5 staff members");

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
