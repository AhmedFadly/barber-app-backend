import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (id: string, w = 1000) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

const everyDay = (open: string, close: string, fri?: [string, string]) =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => (weekday === 5 && fri ? { weekday, open: fri[0], close: fri[1] } : { weekday, open, close }));

async function main() {
  // Wipe in dependency order so the seed is re-runnable.
  await db.$transaction([
    db.payment.deleteMany(),
    db.appointmentService.deleteMany(),
    db.appointment.deleteMany(),
    db.pointsEntry.deleteMany(),
    db.creditEntry.deleteMany(),
    db.giftCard.deleteMany(),
    db.pushToken.deleteMany(),
    db.customer.deleteMany(),
    db.timeOff.deleteMany(),
    db.shift.deleteMany(),
    db.barberService.deleteMany(),
    db.barber.deleteMany(),
    db.service.deleteMany(),
    db.serviceCategory.deleteMany(),
    db.branch.deleteMany(),
    db.newsPost.deleteMany(),
    db.settings.deleteMany(),
  ]);

  await db.settings.create({ data: { id: 1 } });

  const branches = await Promise.all(
    [
      { slug: "city-walk", name: "City Walk", area: "Dubai", address: "Building 7, City Walk, Al Wasl, Dubai", phone: "+971 4 555 0101", imageUrl: img("1585747860715-2ba37e788b70"), latitude: 25.2069, longitude: 55.2625, openingHours: everyDay("10:00", "22:00", ["13:00", "23:00"]) },
      { slug: "difc", name: "DIFC", area: "Dubai", address: "Gate Village 4, DIFC, Dubai", phone: "+971 4 555 0102", imageUrl: img("1512690459411-b9245aed614b"), latitude: 25.2131, longitude: 55.2796, openingHours: everyDay("08:00", "21:00", ["13:00", "21:00"]) },
      { slug: "dubai-marina", name: "Dubai Marina", area: "Dubai", address: "Marina Walk, Tower 2, Dubai Marina", phone: "+971 4 555 0103", imageUrl: img("1600948836101-f9ffda59d250"), latitude: 25.0781, longitude: 55.1403, openingHours: everyDay("10:00", "23:00") },
      { slug: "al-maryah", name: "Al Maryah Island", area: "Abu Dhabi", address: "The Galleria, Al Maryah Island, Abu Dhabi", phone: "+971 2 555 0104", imageUrl: img("1633681926022-84c23e8cb2d6"), latitude: 24.5007, longitude: 54.3891, openingHours: everyDay("10:00", "22:00", ["14:00", "22:00"]) },
    ].map((data, sortOrder) => db.branch.create({ data: { ...data, sortOrder } })),
  );

  const catalog: { slug: string; name: string; services: { slug: string; name: string; description: string; durationMin: number; aed: number; photo: string; popular?: boolean }[] }[] = [
    {
      slug: "hair",
      name: "Hair",
      services: [
        { slug: "signature-haircut", name: "Signature Haircut", description: "Consultation, precision cut, hot towel, wash and finish styled with our house products.", durationMin: 45, aed: 150, photo: "1567894340315-735d7c361db0", popular: true },
        { slug: "skin-fade", name: "Skin Fade", description: "A seamless fade taken down to the skin, blended by hand and detailed with a straight razor.", durationMin: 45, aed: 160, photo: "1593702275687-f8b402bf1fb5", popular: true },
        { slug: "buzz-cut", name: "Buzz Cut", description: "One length all over with clean edges and a neck shave.", durationMin: 30, aed: 90, photo: "1622286342621-4bd786c2447c" },
        { slug: "young-gents-cut", name: "Young Gents Cut", description: "A proper barbershop cut for gentlemen under 12.", durationMin: 30, aed: 90, photo: "1534297635766-a262cdcb8ee4" },
        { slug: "wash-and-style", name: "Wash & Style", description: "Relaxing scalp massage, wash and a blow-dry styled to finish.", durationMin: 20, aed: 60, photo: "1598524374912-6b0b0bab43dd" },
        { slug: "grey-blending", name: "Grey Blending", description: "Natural-looking colour that softens grey without looking dyed.", durationMin: 45, aed: 220, photo: "1621607512214-68297480165e" },
      ],
    },
    {
      slug: "beard-shave",
      name: "Beard & Shave",
      services: [
        { slug: "royal-shave", name: "Royal Hot Towel Shave", description: "Our signature ritual: hot towels, pre-shave oil, rich lather and a straight-razor shave finished with a cold towel.", durationMin: 45, aed: 140, photo: "1596728325488-58c87691e9af", popular: true },
        { slug: "beard-sculpt", name: "Beard Trim & Sculpt", description: "Shape, trim and razor-sharp line-up, finished with beard oil and balm.", durationMin: 30, aed: 95, photo: "1517832606299-7ae9b720a186", popular: true },
        { slug: "beard-line-up", name: "Beard Line-Up", description: "Crisp cheek and neck lines with a straight razor.", durationMin: 15, aed: 55, photo: "1599351431202-1e0f0137899a" },
        { slug: "beard-colour", name: "Beard Colour", description: "Tone and colour for a fuller, even-looking beard.", durationMin: 30, aed: 110, photo: "1532710093739-9470acff878f" },
      ],
    },
    {
      slug: "skin",
      name: "Face & Skin",
      services: [
        { slug: "express-facial", name: "Express Facial", description: "Cleanse, exfoliate and hydrate — a quick reset for tired city skin.", durationMin: 30, aed: 180, photo: "1616394584738-fc6e612e71b9" },
        { slug: "deep-cleansing-facial", name: "Deep Cleansing Facial", description: "Steam, extraction, purifying mask and massage for clear, refreshed skin.", durationMin: 60, aed: 320, photo: "1570172619644-dfd03ed5d881" },
        { slug: "black-mask", name: "Charcoal Peel-Off Mask", description: "Draws out impurities and tightens pores. Perfect add-on to any cut.", durationMin: 15, aed: 70, photo: "1503951914875-452162b0f3f1" },
      ],
    },
    {
      slug: "hands-feet",
      name: "Hands & Feet",
      services: [
        { slug: "gents-manicure", name: "Gents Manicure", description: "Nail shaping, cuticle care, buff and hand massage.", durationMin: 30, aed: 100, photo: "1621605815971-fbc98d665033" },
        { slug: "gents-pedicure", name: "Gents Pedicure", description: "Soak, scrub, nail and cuticle care with a foot massage.", durationMin: 45, aed: 140, photo: "1621607512214-68297480165e" },
      ],
    },
    {
      slug: "rituals",
      name: "Rituals",
      services: [
        { slug: "regent-ritual", name: "The Regent Ritual", description: "Signature haircut, royal hot towel shave and express facial. The full REGENT experience.", durationMin: 120, aed: 420, photo: "1503951914875-452162b0f3f1", popular: true },
        { slug: "grooms-package", name: "The Groom's Package", description: "Haircut, shave, deep cleansing facial, manicure and pedicure before the big day.", durationMin: 180, aed: 850, photo: "1512690459411-b9245aed614b" },
        { slug: "father-and-son", name: "Father & Son", description: "Signature haircut for dad and a young gents cut, back to back.", durationMin: 75, aed: 210, photo: "1534297635766-a262cdcb8ee4" },
      ],
    },
  ];

  const services: { id: string; slug: string; category: string }[] = [];
  for (const [ci, cat] of catalog.entries()) {
    const category = await db.serviceCategory.create({ data: { slug: cat.slug, name: cat.name, sortOrder: ci } });
    for (const [si, s] of cat.services.entries()) {
      const created = await db.service.create({
        data: { slug: s.slug, name: s.name, description: s.description, durationMin: s.durationMin, priceFils: s.aed * 100, imageUrl: img(s.photo, 800), popular: !!s.popular, sortOrder: si, categoryId: category.id },
      });
      services.push({ id: created.id, slug: s.slug, category: cat.slug });
    }
  }

  const barbers = [
    { name: "Karim Haddad", title: "Master Barber", bio: "15 years behind the chair between Beirut and Dubai. Known for sharp classic cuts and flawless razor work.", photo: "1506794778202-cad84cf45f1d", branch: "city-walk", rating: 4.9, skills: ["hair", "beard-shave", "rituals"] },
    { name: "Marco Silva", title: "Senior Barber", bio: "Fade specialist with a love for modern textured styles.", photo: "1507003211169-0a1dd7228f2d", branch: "city-walk", rating: 4.8, skills: ["hair", "beard-shave", "skin", "hands-feet"] },
    { name: "Jamal Okafor", title: "Master Barber", bio: "Precision fades, curls and line-ups. Former competition barber.", photo: "1531384441138-2736e62e0919", branch: "difc", rating: 5, skills: ["hair", "beard-shave", "rituals"] },
    { name: "Viktor Petrov", title: "Beard Specialist", bio: "If it grows on your face, Viktor will make it look intentional.", photo: "1552058544-f2b08422138a", branch: "difc", rating: 4.9, skills: ["hair", "beard-shave", "skin", "hands-feet"] },
    { name: "Kenji Tanaka", title: "Senior Barber", bio: "Scissor-over-comb craftsman with a calm, meticulous style.", photo: "1542327897-d73f4005b533", branch: "dubai-marina", rating: 4.8, skills: ["hair", "beard-shave", "skin", "rituals"] },
    { name: "Omar Farouk", title: "Barber & Groomer", bio: "Hot towel shaves and facials — the most relaxing hour of your week.", photo: "1500648767791-00dcc994a43e", branch: "dubai-marina", rating: 4.7, skills: ["hair", "beard-shave", "skin", "hands-feet", "rituals"] },
    { name: "Arthur Blake", title: "Master Barber", bio: "Old-school London barbering, three decades of it.", photo: "1504257432389-52343af06ae3", branch: "al-maryah", rating: 4.9, skills: ["hair", "beard-shave", "rituals"] },
    { name: "Daniel Reyes", title: "Senior Barber", bio: "Clean business cuts and grooming for Abu Dhabi's busiest diaries.", photo: "1607990281513-2c110a25bd8c", branch: "al-maryah", rating: 4.8, skills: ["hair", "beard-shave", "skin", "hands-feet", "rituals"] },
  ];

  for (const [i, b] of barbers.entries()) {
    const branch = branches.find((x) => x.slug === b.branch)!;
    const hours = branch.openingHours as { weekday: number; open: string; close: string }[];
    const toMin = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3);
    // Two barbers per branch on staggered shifts; each takes one weekday off.
    const dayOff = (i * 3) % 7;
    await db.barber.create({
      data: {
        name: b.name,
        title: b.title,
        bio: b.bio,
        photoUrl: img(b.photo, 600),
        rating: b.rating,
        branchId: branch.id,
        services: { create: services.filter((s) => b.skills.includes(s.category)).map((s) => ({ serviceId: s.id })) },
        shifts: {
          create: hours
            .filter((h) => h.weekday !== dayOff)
            .map((h) => {
              const open = toMin(h.open);
              const close = toMin(h.close);
              const mid = Math.round((open + close) / 2 / 60) * 60;
              return i % 2 === 0 ? { weekday: h.weekday, startMin: open, endMin: Math.min(close, mid + 120) } : { weekday: h.weekday, startMin: Math.max(open, mid - 120), endMin: close };
            }),
        },
      },
    });
  }

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  await db.newsPost.createMany({
    data: [
      { title: "Now open: REGENT Al Maryah Island", summary: "Our first Abu Dhabi house is open in The Galleria. Book your first visit and get double points all month.", body: "We're proud to open our fourth house at The Galleria, Al Maryah Island.\n\nArthur and Daniel lead the team, bringing old-school London barbering to the capital. To celebrate, every visit to Al Maryah Island earns double REGENT points until the end of the month.\n\nOpen daily 10:00–22:00, Fridays from 14:00.", imageUrl: img("1633681926022-84c23e8cb2d6"), tag: "New branch", pinned: true, publishedAt: daysAgo(2) },
      { title: "The Groom's Package is back", summary: "Wedding season is here. Look sharp on the big day with our full five-service ritual.", body: "Haircut, royal hot towel shave, deep cleansing facial, manicure and pedicure — three hours, one very well-groomed groom.\n\nBook for the groom and his party together: call your branch for group bookings of four or more.", imageUrl: img("1512690459411-b9245aed614b"), tag: "Offer", publishedAt: daysAgo(6) },
      { title: "Meet Jamal, our DIFC master barber", summary: "Former competition barber Jamal Okafor on fades, curls and why the line-up matters most.", body: "Jamal has been cutting hair since he was fourteen and spent six years on the competition circuit before joining REGENT DIFC.\n\n\"A fade is maths, a line-up is art,\" he says. Book Jamal in the app — he's in DIFC every day except Wednesday.", imageUrl: img("1622287162716-f311baa1a2b8"), tag: "Our barbers", publishedAt: daysAgo(12) },
      { title: "New: REGENT beard oil & balm", summary: "Our house grooming line is now available at every branch. Ask your barber for a sample.", body: "Developed with a Dubai perfumer, our beard oil blends argan and jojoba with notes of oud and bergamot. The balm adds hold for longer beards.\n\nAvailable at reception in all four houses.", imageUrl: img("1621605815971-fbc98d665033"), tag: "Products", publishedAt: daysAgo(20) },
    ],
  });

  // Demo customer with some history.
  const demo = await db.customer.create({
    data: {
      email: "demo@regent.ae",
      passwordHash: await bcrypt.hash("regent123", 10),
      firstName: "Ahmed",
      lastName: "Demo",
      phone: "+971 50 123 4567",
      referralCode: "AHMEDX7K2",
      pointsBalance: 640,
      lifetimePoints: 1140,
      tier: "GOLD",
      creditFils: 5000,
    },
  });
  await db.pointsEntry.createMany({
    data: [
      { customerId: demo.id, points: 420, reason: "Visit RG-SEED01", sourceKey: "seed:1", createdAt: daysAgo(40) },
      { customerId: demo.id, points: 160, reason: "Visit RG-SEED02", sourceKey: "seed:2", createdAt: daysAgo(25) },
      { customerId: demo.id, points: 560, reason: "Visit RG-SEED03", sourceKey: "seed:3", createdAt: daysAgo(9) },
      { customerId: demo.id, points: -500, reason: "Converted to wallet credit", sourceKey: "seed:4", createdAt: daysAgo(8) },
    ],
  });
  await db.creditEntry.create({ data: { customerId: demo.id, amountFils: 5000, reason: "500 points redeemed", sourceKey: "seed:4", createdAt: daysAgo(8) } });

  console.log(`Seeded ${branches.length} branches, ${services.length} services, ${barbers.length} barbers. Demo login: demo@regent.ae / regent123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
