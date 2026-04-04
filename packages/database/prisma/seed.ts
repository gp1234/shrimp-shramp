import { PrismaClient } from "../generated/prisma";
import * as bcrypt from "bcryptjs";
import { seedProjectionData } from "./seed-projection";

const prisma = new PrismaClient();

async function main() {
  console.log("🦐 Seeding Shrampi database...\n");

  // Clean existing data (reverse dependency order)
  await prisma.pondWeeklyAnalysis.deleteMany();
  await prisma.feedProjectionPondDay.deleteMany();
  await prisma.weeklyFeedProjection.deleteMany();
  await prisma.feedSupplierTable.deleteMany();
  await prisma.fCAReference.deleteMany();
  await prisma.revenueRecord.deleteMany();
  await prisma.productionCost.deleteMany();
  await prisma.operationalCost.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.feedingLog.deleteMany();
  await prisma.waterQualityLog.deleteMany();
  await prisma.mortalityRecord.deleteMany();
  await prisma.harvestRecord.deleteMany();
  await prisma.stockingRecord.deleteMany();
  await prisma.cycleStage.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.feedInventory.deleteMany();
  await prisma.feedType.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.preweightSample.deleteMany();
  await prisma.preweightPondEntry.deleteMany();
  await prisma.weeklyPreweight.deleteMany();
  await prisma.populationSampling.deleteMany();
  await prisma.dailyWaterPondEntry.deleteMany();
  await prisma.dailyWaterControl.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.sensor.deleteMany();
  await prisma.device.deleteMany();
  await prisma.pondZone.deleteMany();
  await prisma.pond.deleteMany();
  console.log("🧹 Cleaned existing data");

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
  console.log(`✅ ${roles.length} roles`);

  // ──────────────────────────────────────────
  // 2. Permissions
  // ──────────────────────────────────────────
  const resources = [
    "farms", "ponds", "cycles", "feeding", "water_quality",
    "inventory", "personnel", "financial", "preweight",
    "population_sampling", "water_control", "users", "settings",
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

  const adminRole = roles.find((r) => r.name === "Admin")!;
  const managerRole = roles.find((r) => r.name === "Farm Manager")!;
  const supervisorRole = roles.find((r) => r.name === "Supervisor")!;
  const operatorRole = roles.find((r) => r.name === "Operator")!;

  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log(`✅ ${permissions.length} permissions`);

  // ──────────────────────────────────────────
  // 3. Company
  // ──────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000099" },
    update: {},
    create: { id: "00000000-0000-0000-0000-000000000099", name: "Grupo Camaronero Esmeralda S.A." },
  });

  // ──────────────────────────────────────────
  // 4. Users
  // ──────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || "admin@shrampi.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: await bcrypt.hash(adminPassword, 10) },
    create: {
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      name: "Giovanni Admin",
      companyId: company.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: "jrodriguez@esmeralda.ec" },
    update: {},
    create: {
      email: "jrodriguez@esmeralda.ec",
      passwordHash: await bcrypt.hash("Manager123!", 10),
      name: "Jorge Rodriguez",
      companyId: company.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
    update: {},
    create: { userId: managerUser.id, roleId: managerRole.id },
  });

  const supervisorUser = await prisma.user.upsert({
    where: { email: "mcevallos@esmeralda.ec" },
    update: {},
    create: {
      email: "mcevallos@esmeralda.ec",
      passwordHash: await bcrypt.hash("Super123!", 10),
      name: "Maria Cevallos",
      companyId: company.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: supervisorUser.id, roleId: supervisorRole.id } },
    update: {},
    create: { userId: supervisorUser.id, roleId: supervisorRole.id },
  });

  const operatorUser = await prisma.user.upsert({
    where: { email: "lmendoza@esmeralda.ec" },
    update: {},
    create: {
      email: "lmendoza@esmeralda.ec",
      passwordHash: await bcrypt.hash("Oper123!", 10),
      name: "Luis Mendoza",
      companyId: company.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: operatorUser.id, roleId: operatorRole.id } },
    update: {},
    create: { userId: operatorUser.id, roleId: operatorRole.id },
  });
  console.log("✅ 4 users (admin, manager, supervisor, operator)");

  // ──────────────────────────────────────────
  // 5. Farms
  // ──────────────────────────────────────────
  const farm = await prisma.farm.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      companyId: company.id,
      name: "Camaronera La Esmeralda",
      location: "Km 26 vía Durán-Tambo, Guayas, Ecuador",
      totalArea: 72.5,
      waterSource: "Estero Salado",
    },
  });

  const farm2 = await prisma.farm.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      companyId: company.id,
      name: "Camaronera La Entrada",
      location: "Puerto Bolívar, El Oro, Ecuador",
      totalArea: 45.0,
      waterSource: "Estero Santa Rosa",
    },
  });
  console.log(`✅ 2 farms: ${farm.name}, ${farm2.name}`);

  // ──────────────────────────────────────────
  // 6. Ponds — realistic Ecuadorian layout
  // ──────────────────────────────────────────
  const pondData = [
    { code: "Ps1", name: "Piscina 1", area: 7.18, depth: 1.2, status: "ACTIVE" as const },
    { code: "Ps2", name: "Piscina 2", area: 6.50, depth: 1.1, status: "ACTIVE" as const },
    { code: "Ps3", name: "Piscina 3", area: 8.20, depth: 1.3, status: "ACTIVE" as const },
    { code: "Ps4", name: "Piscina 4", area: 5.90, depth: 1.2, status: "ACTIVE" as const },
    { code: "Ps5", name: "Piscina 5", area: 7.50, depth: 1.1, status: "ACTIVE" as const },
    { code: "Ps6", name: "Piscina 6", area: 6.80, depth: 1.2, status: "ACTIVE" as const },
    { code: "Ps7", name: "Piscina 7", area: 7.25, depth: 1.2, status: "ACTIVE" as const },
    { code: "Ps8", name: "Piscina 8", area: 5.40, depth: 1.0, status: "ACTIVE" as const },
    { code: "Ps9", name: "Piscina 9", area: 8.00, depth: 1.3, status: "PREPARING" as const },
    { code: "Ps10", name: "Piscina 10", area: 6.10, depth: 1.2, status: "MAINTENANCE" as const },
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
        capacity: Math.round(pd.area * 10000 * 200),
        status: pd.status,
      },
    });
    ponds.push(pond);
  }
  console.log(`✅ ${ponds.length} ponds (Ps1–Ps10)`);

  // ──────────────────────────────────────────
  // 7. Cycles — 8 active cycles, stocked at different weeks
  // Current date context: ~April 4 2026
  // ──────────────────────────────────────────
  const cycleConfigs = [
    // Ps1: stocked Jan 10 → day ~84, weight ~5g
    { pondIdx: 0, name: "C1-2026", start: "2026-01-10", stock: 1_436_000, density: 200, target: 28 },
    // Ps2: stocked Jan 17 → day ~77, weight ~4.5g
    { pondIdx: 1, name: "C2-2026", start: "2026-01-17", stock: 1_300_000, density: 200, target: 26 },
    // Ps3: stocked Dec 20 → day ~105, weight ~8g
    { pondIdx: 2, name: "C3-2025", start: "2025-12-20", stock: 1_640_000, density: 200, target: 30 },
    // Ps4: stocked Feb 1 → day ~62, weight ~3g
    { pondIdx: 3, name: "C4-2026", start: "2026-02-01", stock: 1_180_000, density: 200, target: 24 },
    // Ps5: stocked Jan 3 → day ~91, weight ~6g
    { pondIdx: 4, name: "C5-2026", start: "2026-01-03", stock: 1_500_000, density: 200, target: 28 },
    // Ps6: stocked Feb 14 → day ~49, weight ~2g
    { pondIdx: 5, name: "C6-2026", start: "2026-02-14", stock: 1_360_000, density: 200, target: 22 },
    // Ps7: stocked Nov 15 → day ~140, weight ~13g
    { pondIdx: 6, name: "C7-2025", start: "2025-11-15", stock: 1_450_000, density: 200, target: 32 },
    // Ps8: stocked Mar 1 → day ~34, weight ~1g
    { pondIdx: 7, name: "C8-2026", start: "2026-03-01", stock: 1_080_000, density: 200, target: 20 },
  ];

  const cycles: Awaited<ReturnType<typeof prisma.cycle.create>>[] = [];
  for (const cc of cycleConfigs) {
    const startDate = new Date(cc.start);
    const expectedEnd = new Date(startDate);
    expectedEnd.setDate(expectedEnd.getDate() + 120);
    const cycle = await prisma.cycle.create({
      data: {
        pondId: ponds[cc.pondIdx]!.id,
        name: cc.name,
        species: "Litopenaeus vannamei",
        status: "GROWING",
        startDate,
        expectedEndDate: expectedEnd,
        initialStock: cc.stock,
        stockDensity: cc.density,
        targetWeight: cc.target,
      },
    });
    cycles.push(cycle);
  }

  // Completed cycle on Ps9 from last year
  const completedCycle = await prisma.cycle.create({
    data: {
      pondId: ponds[8]!.id,
      name: "C-2025-Q3",
      species: "Litopenaeus vannamei",
      status: "COMPLETED",
      startDate: new Date("2025-07-01"),
      actualEndDate: new Date("2025-10-28"),
      initialStock: 1_600_000,
      stockDensity: 200,
      targetWeight: 30,
    },
  });
  console.log(`✅ ${cycles.length + 1} cycles (${cycles.length} growing, 1 completed)`);

  // ──────────────────────────────────────────
  // 8. Stocking Records
  // ──────────────────────────────────────────
  await prisma.stockingRecord.createMany({
    data: [
      ...cycleConfigs.map((cc, i) => ({
        cycleId: cycles[i]!.id,
        date: new Date(cc.start),
        quantity: cc.stock,
        averageWeight: 0.01,
        source: i % 2 === 0 ? "Laboratorio SEMACUA" : "Larvicultura del Pacífico",
        plDensity: cc.density,
        cost: Math.round(cc.stock * 0.005),
      })),
      {
        cycleId: completedCycle.id,
        date: new Date("2025-07-01"),
        quantity: 1_600_000,
        averageWeight: 0.01,
        source: "Laboratorio SEMACUA",
        plDensity: 200,
        cost: 8000,
      },
    ],
  });
  console.log("✅ Stocking records");

  // ──────────────────────────────────────────
  // 9. Feed Types
  // ──────────────────────────────────────────
  const feed1 = await prisma.feedType.create({
    data: { name: "Masterline EXT #5 BI", brand: "EXPALSA", proteinPct: 35, size: "2.5mm", costPerKg: 0.82 },
  });
  const feed2 = await prisma.feedType.create({
    data: { name: "Nicovita Kg AL38 2.4mm", brand: "Nicovita", proteinPct: 38, size: "2.4mm", costPerKg: 0.91 },
  });
  const feed3 = await prisma.feedType.create({
    data: { name: "Nicovita Pre-Inicio 0.8mm", brand: "Nicovita", proteinPct: 42, size: "0.8mm", costPerKg: 2.10 },
  });
  console.log("✅ 3 feed types");

  // ──────────────────────────────────────────
  // 10. Feeding Logs — last 14 days for active ponds
  // ──────────────────────────────────────────
  const feedingLogs: any[] = [];
  // Per-pond base feed amounts (lbs/day) roughly matching their current weight
  const baseFeedLbs = [575, 500, 1100, 300, 750, 200, 1400, 100];
  for (let day = 0; day < 14; day++) {
    const date = new Date("2026-03-21");
    date.setDate(date.getDate() + day);
    for (let p = 0; p < 8; p++) {
      const dailyKg = Math.round((baseFeedLbs[p]! * 0.4536 + (Math.random() - 0.5) * 10) * 10) / 10;
      feedingLogs.push({
        pondId: ponds[p]!.id,
        cycleId: cycles[p]!.id,
        feedTypeId: p < 6 ? feed1.id : feed2.id,
        date,
        quantity: dailyKg,
        mealNumber: 1,
      });
    }
  }
  await prisma.feedingLog.createMany({ data: feedingLogs });
  console.log(`✅ ${feedingLogs.length} feeding logs (14 days × 8 ponds)`);

  // ──────────────────────────────────────────
  // 11. Water Quality Logs — last 14 days for 3 ponds
  // ──────────────────────────────────────────
  const waterLogs: any[] = [];
  for (let day = 0; day < 14; day++) {
    const date = new Date("2026-03-21");
    date.setDate(date.getDate() + day);
    for (const p of [0, 2, 6]) {
      waterLogs.push({
        pondId: ponds[p]!.id,
        date,
        temperature: 27.5 + Math.random() * 2.5,
        ph: 7.8 + Math.random() * 0.6,
        dissolvedOxygen: 4.5 + Math.random() * 2.5,
        salinity: 18 + Math.random() * 7,
        ammonia: 0.01 + Math.random() * 0.03,
        recordedBy: "Maria Cevallos",
      });
    }
  }
  await prisma.waterQualityLog.createMany({ data: waterLogs });
  console.log(`✅ ${waterLogs.length} water quality logs`);

  // ──────────────────────────────────────────
  // 12. Mortality Records
  // ──────────────────────────────────────────
  await prisma.mortalityRecord.createMany({
    data: [
      { cycleId: cycles[0]!.id, date: new Date("2026-01-18"), count: 8500, cause: "Natural post-siembra" },
      { cycleId: cycles[0]!.id, date: new Date("2026-02-05"), count: 3200, cause: "Bajón de oxígeno" },
      { cycleId: cycles[2]!.id, date: new Date("2026-01-10"), count: 12000, cause: "Natural" },
      { cycleId: cycles[2]!.id, date: new Date("2026-02-15"), count: 5000, cause: "Vibriosis leve" },
      { cycleId: cycles[6]!.id, date: new Date("2025-12-01"), count: 15000, cause: "Natural post-siembra" },
      { cycleId: cycles[6]!.id, date: new Date("2026-01-20"), count: 4000, cause: "Estrés térmico" },
    ],
  });
  console.log("✅ Mortality records");

  // ──────────────────────────────────────────
  // 13. Harvest Record (completed cycle)
  // ──────────────────────────────────────────
  await prisma.harvestRecord.create({
    data: {
      cycleId: completedCycle.id,
      date: new Date("2025-10-28"),
      quantity: 1_120_000,
      totalWeight: 30240,
      averageWeight: 27.0,
      pricePerUnit: 2.80,
      totalRevenue: 84672,
      survivalRate: 70,
      harvestType: "full",
      buyer: "Empagran S.A.",
    },
  });
  console.log("✅ Harvest record (Ps9 completed cycle)");

  // ──────────────────────────────────────────
  // 14. Expense Categories & Costs
  // ──────────────────────────────────────────
  const categories = await Promise.all(
    [
      "seed.category.labor", "seed.category.feed", "seed.category.chemicals",
      "seed.category.energy", "seed.category.equipment", "seed.category.maintenance",
      "seed.category.transport", "seed.category.other",
    ].map((name) =>
      prisma.expenseCategory.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  const feedCat = categories.find((c) => c.name === "seed.category.feed")!;
  const laborCat = categories.find((c) => c.name === "seed.category.labor")!;
  const energyCat = categories.find((c) => c.name === "seed.category.energy")!;

  await prisma.productionCost.createMany({
    data: [
      { cycleId: completedCycle.id, categoryId: feedCat.id, description: "Alimento ciclo completo", amount: 42000, date: new Date("2025-10-28") },
      { cycleId: completedCycle.id, categoryId: laborCat.id, description: "Mano de obra 4 meses", amount: 12000, date: new Date("2025-10-28") },
      { cycleId: completedCycle.id, categoryId: energyCat.id, description: "Diésel y electricidad", amount: 6800, date: new Date("2025-10-28") },
    ],
  });

  await prisma.revenueRecord.create({
    data: {
      cycleId: completedCycle.id,
      description: "Venta cosecha completa a Empagran S.A.",
      amount: 84672,
      date: new Date("2025-11-02"),
      source: "Empagran S.A.",
    },
  });
  console.log("✅ Financial records");

  // ──────────────────────────────────────────
  // 15. Staff
  // ──────────────────────────────────────────
  await prisma.staff.createMany({
    data: [
      { farmId: farm.id, firstName: "Jorge", lastName: "Rodriguez", position: "Farm Manager", phone: "+593-99-8712345", hireDate: new Date("2019-03-15") },
      { farmId: farm.id, firstName: "Maria", lastName: "Cevallos", position: "Supervisor", phone: "+593-99-6543210", hireDate: new Date("2020-08-01") },
      { farmId: farm.id, firstName: "Luis", lastName: "Mendoza", position: "Operator", phone: "+593-99-1112233", hireDate: new Date("2021-02-10") },
      { farmId: farm.id, firstName: "Carlos", lastName: "Pincay", position: "Operator", phone: "+593-99-4445566", hireDate: new Date("2022-01-20") },
      { farmId: farm.id, firstName: "Rosa", lastName: "Villavicencio", position: "Operator", phone: "+593-99-7778899", hireDate: new Date("2023-05-15") },
      { farmId: farm.id, firstName: "Pedro", lastName: "Quiñonez", position: "Operator", phone: "+593-99-3334455", hireDate: new Date("2024-01-08") },
    ],
  });
  console.log("✅ 6 staff members");

  // ──────────────────────────────────────────
  // 16. Inventory
  // ──────────────────────────────────────────
  await prisma.inventoryItem.createMany({
    data: [
      { name: "Masterline EXT #5 BI (25kg sacos)", category: "FEED", unit: "saco", currentStock: 120, minimumStock: 30, costPerUnit: 20.50 },
      { name: "Nicovita Kg AL38 (25kg sacos)", category: "FEED", unit: "saco", currentStock: 85, minimumStock: 20, costPerUnit: 22.75 },
      { name: "Hipoclorito de Calcio", category: "CHEMICAL", unit: "kg", currentStock: 200, minimumStock: 50, costPerUnit: 3.40 },
      { name: "Probiótico AquaStar", category: "CHEMICAL", unit: "L", currentStock: 15, minimumStock: 5, costPerUnit: 28.00 },
      { name: "Cal viva", category: "CHEMICAL", unit: "saco", currentStock: 40, minimumStock: 10, costPerUnit: 8.50 },
      { name: "Paleta de aireador", category: "EQUIPMENT", unit: "unidad", currentStock: 12, minimumStock: 4, costPerUnit: 380.00 },
      { name: "Diésel", category: "OTHER", unit: "galón", currentStock: 450, minimumStock: 100, costPerUnit: 2.30 },
    ],
  });
  console.log("✅ 7 inventory items");

  // ──────────────────────────────────────────
  // 17. Weekly Preweights — 3 weeks of data
  // Fridays: Mar 21, Mar 28, Apr 4
  // ──────────────────────────────────────────
  // Current shrimp weights per pond (grams) — realistic growth progression
  // Week 1 (Mar 21), Week 2 (Mar 28), Week 3 (Apr 4)
  const pondWeights: { avgW: [number, number, number]; growth: [number, number, number] }[] = [
    { avgW: [4.20, 4.72, 5.10], growth: [0.45, 0.52, 0.38] },  // Ps1
    { avgW: [3.60, 4.10, 4.52], growth: [0.42, 0.50, 0.42] },  // Ps2
    { avgW: [7.10, 7.65, 8.15], growth: [0.50, 0.55, 0.50] },  // Ps3
    { avgW: [2.30, 2.72, 3.10], growth: [0.35, 0.42, 0.38] },  // Ps4
    { avgW: [5.20, 5.75, 6.28], growth: [0.48, 0.55, 0.53] },  // Ps5
    { avgW: [1.50, 1.82, 2.15], growth: [0.28, 0.32, 0.33] },  // Ps6
    { avgW: [11.80, 12.35, 13.00], growth: [0.55, 0.55, 0.65] },// Ps7
    { avgW: [0.65, 0.88, 1.12], growth: [0.18, 0.23, 0.24] },  // Ps8
  ];

  const preweightDates = ["2026-03-21", "2026-03-28", "2026-04-04"];
  for (let week = 0; week < 3; week++) {
    const pw = await prisma.weeklyPreweight.create({
      data: {
        farmId: farm.id,
        samplingDate: new Date(preweightDates[week]!),
        notes: week === 2 ? "Muestreo de esta semana" : null,
        createdById: supervisorUser.id,
      },
    });

    for (let p = 0; p < 8; p++) {
      const avgW = pondWeights[p]!.avgW[week]!;
      const growth = pondWeights[p]!.growth[week]!;
      const startDate = new Date(cycleConfigs[p]!.start);
      const sampDate = new Date(preweightDates[week]!);
      const cultureDays = Math.round((sampDate.getTime() - startDate.getTime()) / 86400000);

      const entry = await prisma.preweightPondEntry.create({
        data: {
          weeklyPreweightId: pw.id,
          pondId: ponds[p]!.id,
          growthRate: growth * 7, // weekly
          mortality: Math.floor(Math.random() * 3),
          disease: Math.floor(Math.random() * 2),
          molt: Math.floor(Math.random() * 4),
          cultureDays,
          totalNumber: 30,
          totalWeight: avgW * 30,
          averageWeight: avgW,
        },
      });

      // 3 samples per entry
      for (let s = 0; s < 3; s++) {
        const n = 10;
        const sampleAvg = avgW + (Math.random() - 0.5) * 0.4;
        await prisma.preweightSample.create({
          data: {
            preweightPondEntryId: entry.id,
            number: n,
            weight: Math.round(sampleAvg * n * 100) / 100,
            averageWeight: Math.round(sampleAvg * 100) / 100,
          },
        });
      }
    }
  }
  console.log("✅ 3 weeks of preweight data (8 ponds × 3 samples each)");

  // ──────────────────────────────────────────
  // 18. Population Samplings (atarraya) — most recent week
  // Realistic densities after mortality
  // ──────────────────────────────────────────
  const pondDensities = [25.35, 23.10, 28.50, 20.80, 26.40, 18.90, 36.00, 15.20];
  const samplingDate = new Date("2026-04-04"); // Friday

  for (let p = 0; p < 8; p++) {
    const hectares = pondData[p]!.area;
    const stockingCount = cycleConfigs[p]!.stock;
    const density = pondDensities[p]!;
    const avgWeight = pondWeights[p]!.avgW[2]!; // latest week

    // Generate realistic cast net counts (6 rows × 4 columns grid)
    const throws = 24;
    const castNetCounts: number[] = [];
    for (let i = 0; i < throws; i++) {
      castNetCounts.push(Math.round(density + (Math.random() - 0.5) * 8));
    }
    const totalCount = castNetCounts.reduce((a, b) => a + b, 0);
    const countPerThrow = totalCount / throws;

    await prisma.populationSampling.create({
      data: {
        farmId: farm.id,
        pondId: ponds[p]!.id,
        samplingDate,
        hectares,
        stockingCount,
        castNetCounts,
        gridColumns: 4,
        entradaRows: 5,
        salidaRows: 1,
        numberOfThrows: throws,
        totalCount,
        countPerThrow,
        shrimpPerSqMeter: countPerThrow,
        averageWeight: avgWeight,
        waterLevel: 0.9 + Math.random() * 0.3,
        oldMolts: Math.floor(Math.random() * 3),
        oldMoltsPercent: Math.random() * 2,
        freshMolts: Math.floor(Math.random() * 5),
        freshMoltsPercent: Math.random() * 3,
        diseaseCount: p === 5 ? 4 : Math.floor(Math.random() * 2), // Ps6 has higher disease
        diseasePercent: p === 5 ? 4.2 : Math.random() * 1.5,
        observations: p === 5 ? "Se observa mancha blanca leve en algunos individuos" : null,
        createdById: supervisorUser.id,
      },
    });
  }
  console.log("✅ 8 population samplings (atarraya, Apr 4)");

  // ──────────────────────────────────────────
  // 19. Daily Water Control — last 3 days
  // ──────────────────────────────────────────
  for (let day = 0; day < 3; day++) {
    const date = new Date("2026-04-02");
    date.setDate(date.getDate() + day);
    for (const time of ["AM", "PM"] as const) {
      const control = await prisma.dailyWaterControl.create({
        data: {
          farmId: farm.id,
          recordDate: date,
          recordTime: time,
          farmSection: "La Esmeralda",
          createdById: operatorUser.id,
        },
      });

      const entries: any[] = [];
      for (let p = 0; p < 8; p++) {
        for (const gate of ["L1", "C", "L2"]) {
          entries.push({
            dailyWaterControlId: control.id,
            pondId: ponds[p]!.id,
            gateId: gate,
            gateHeightInches: 2 + Math.random() * 6,
            turbiditySecchiCm: 25 + Math.random() * 20,
            waterColor: ["Verde claro", "Verde oscuro", "Marrón claro", "Verde"][Math.floor(Math.random() * 4)],
          });
        }
      }
      await prisma.dailyWaterPondEntry.createMany({ data: entries });
    }
  }
  console.log("✅ 3 days of water control (AM/PM × 8 ponds × 3 gates)");

  // ──────────────────────────────────────────
  // 20. Projection Reference Data (supplier tables + FCA)
  // ──────────────────────────────────────────
  await seedProjectionData(farm.id);

  // ──────────────────────────────────────────
  // 21. Weekly Feed Projection — current week (Apr 4 → Apr 11)
  // Pre-built so the grid has data immediately
  // ──────────────────────────────────────────
  const weekStart = new Date("2026-04-04");
  const weekEnd = new Date("2026-04-11");

  const projection = await prisma.weeklyFeedProjection.create({
    data: {
      farmId: farm.id,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      status: "approved",
      supplierName: "EXPALSA",
      createdById: managerUser.id,
    },
  });

  // Generate 8 days × 8 ponds of projection data
  const projDays: any[] = [];
  let totalWeekFeedLbs = 0;

  for (let p = 0; p < 8; p++) {
    const startWeight = pondWeights[p]!.avgW[2]!; // latest preweight
    const weeklyGrowth = pondWeights[p]!.growth[2]! * 7;
    const dailyGrowth = weeklyGrowth / 7;
    const density = pondDensities[p]!;
    const hectares = pondData[p]!.area;

    let weight = startWeight;
    for (let d = 0; d < 8; d++) {
      if (d > 0) weight = Math.round((weight + dailyGrowth) * 100) / 100;

      const biomassKg = Math.round(weight * density * hectares * 10 * 100) / 100;
      const biomassLbs = Math.round(weight * density * hectares * 10000 / 454);

      // BW% lookup approximation
      let bwPct: number;
      if (weight < 2) bwPct = 6.3;
      else if (weight < 5) bwPct = 5.0;
      else if (weight < 8) bwPct = 4.5;
      else if (weight < 12) bwPct = 4.0;
      else bwPct = 3.7;

      const feedRaw = biomassKg * bwPct / 100;
      const feedLbs = Math.round(feedRaw / 25) * 25;
      const khdFeed = Math.round(feedLbs / hectares);

      totalWeekFeedLbs += feedLbs;

      projDays.push({
        weeklyFeedProjectionId: projection.id,
        pondId: ponds[p]!.id,
        dayDate: new Date(weekStart.getTime() + d * 86400000),
        dayIndex: d,
        isRealData: d === 0, // Friday has real data from today's sampling
        hectares,
        weeklyGrowthRate: weeklyGrowth,
        dailyGrowthRate: dailyGrowth,
        weight,
        weightProjected: null,
        weightDeviation: null,
        density,
        biomassLbs,
        biomassKg,
        bwPercent: bwPct,
        feedQuantityLbs: feedLbs,
        feedQuantityOverride: null,
        khdFeed,
        feedType: p < 6 ? "Masterline EXT #5 BI" : "Nicovita Kg AL38 2.4mm",
      });
    }
  }

  await prisma.feedProjectionPondDay.createMany({ data: projDays });

  const totalKg = Math.round(totalWeekFeedLbs * 0.4536 * 100) / 100;
  await prisma.weeklyFeedProjection.update({
    where: { id: projection.id },
    data: { totalWeeklyFeedKg: totalKg },
  });
  console.log(`✅ Weekly projection (Apr 4–11): 8 ponds × 8 days, ${totalKg} kg total`);

  // ──────────────────────────────────────────
  // 22. Pond Weekly Analysis with alerts
  // ──────────────────────────────────────────
  const analysisData = [
    { p: 0, projW: 5.20, actW: 5.10, alert: "normal", reasons: [] },
    { p: 1, projW: 4.60, actW: 4.52, alert: "normal", reasons: [] },
    { p: 2, projW: 8.50, actW: 8.15, alert: "warning", reasons: ["weight_below_projected"] },
    { p: 3, projW: 3.00, actW: 3.10, alert: "normal", reasons: [] },
    { p: 4, projW: 6.00, actW: 6.28, alert: "normal", reasons: [] },
    { p: 5, projW: 2.40, actW: 2.15, alert: "warning", reasons: ["weight_below_projected", "disease_percent_high"] },
    { p: 6, projW: 13.20, actW: 13.00, alert: "normal", reasons: [] },
    { p: 7, projW: 1.20, actW: 1.12, alert: "normal", reasons: [] },
  ];

  for (const ad of analysisData) {
    const devPct = ad.actW != null ? Math.round(((ad.actW - ad.projW) / ad.projW) * 10000) / 100 : null;
    await prisma.pondWeeklyAnalysis.create({
      data: {
        weeklyFeedProjectionId: projection.id,
        pondId: ponds[ad.p]!.id,
        weekDate: weekStart,
        projectedWeight: ad.projW,
        actualWeight: ad.actW,
        weightDeviationPercent: devPct,
        projectedBiomassKg: Math.round(ad.projW * pondDensities[ad.p]! * pondData[ad.p]!.area * 10),
        atarrayaBiomassKg: ad.actW ? Math.round(ad.actW * pondDensities[ad.p]! * pondData[ad.p]!.area * 10) : null,
        alertLevel: ad.alert,
        alertReasons: ad.reasons,
      },
    });
  }
  console.log("✅ 8 pond analyses (2 warnings: Ps3 weight, Ps6 disease)");

  console.log("\n🎉 Seed completed — ready for end-to-end demo!");
  console.log("   Login: admin@shrampi.com / Admin123!");
  console.log("   Farm: Camaronera La Esmeralda (10 ponds, 8 active cycles)");
  console.log("   Projection: Week Apr 4–11 (approved, EXPALSA)\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
