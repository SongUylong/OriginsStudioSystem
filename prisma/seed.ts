import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Hash passwords
  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create manager users
  const samWujiale = await prisma.user.upsert({
    where: { email: "sam@origins.com" },
    update: {},
    create: {
      email: "sam@origins.com",
      name: "Sam Wujiale",
      password: hashedPassword,
      role: "MANAGER",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  const alizaSanny = await prisma.user.upsert({
    where: { email: "aliza@origins.com" },
    update: {},
    create: {
      email: "aliza@origins.com",
      name: "Aliza Sanny Sreng",
      password: hashedPassword,
      role: "MANAGER",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  // Create BK user
  const bkUser = await prisma.user.upsert({
    where: { email: "bk@origins.com" },
    update: {},
    create: {
      email: "bk@origins.com",
      name: "BK",
      password: hashedPassword,
      role: "BK",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  // Create staff users
  const songUylong = await prisma.user.upsert({
    where: { email: "song@origins.com" },
    update: {},
    create: {
      email: "song@origins.com",
      name: "Song Uylong",
      password: hashedPassword,
      role: "STAFF",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  const naSereybosha = await prisma.user.upsert({
    where: { email: "na@origins.com" },
    update: {},
    create: {
      email: "na@origins.com",
      name: "Na Sereybosha",
      password: hashedPassword,
      role: "STAFF",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  const davinHorn = await prisma.user.upsert({
    where: { email: "davin@origins.com" },
    update: {},
    create: {
      email: "davin@origins.com",
      name: "Davin Horn",
      password: hashedPassword,
      role: "STAFF",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  const liya = await prisma.user.upsert({
    where: { email: "liya@origins.com" },
    update: {},
    create: {
      email: "liya@origins.com",
      name: "Liya",
      password: hashedPassword,
      role: "STAFF",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  const bovy = await prisma.user.upsert({
    where: { email: "bovy@origins.com" },
    update: {},
    create: {
      email: "bovy@origins.com",
      name: "Bovy",
      password: hashedPassword,
      role: "STAFF",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  });

  console.log("Seed data created successfully!");
  console.log({
    managers: { samWujiale, alizaSanny },
    bk: { bkUser },
    staff: {
      songUylong,
      naSereybosha,
      davinHorn,
      liya,
      bovy,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
