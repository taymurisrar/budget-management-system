import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import type {
  AccountGroup,
  AccountSubtype,
  CategoryType,
  InventoryUnit,
} from "../src/generated/prisma/client";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function seedUser() {
  return prisma.user.upsert({
    where: { email: "taimur@example.com" },
    update: {
      name: "Taimur",
      passwordHash: "dev-password",
      baseCurrencyCode: "QAR",
      timezone: "Asia/Qatar",
    },
    create: {
      name: "Taimur",
      email: "taimur@example.com",
      passwordHash: "dev-password",
      baseCurrencyCode: "QAR",
      timezone: "Asia/Qatar",
    },
  });
}

async function seedAccounts(userId: string) {
  const accounts = [
    {
      name: "Cash Wallet",
      group: "debit",
      subtype: "cash",
      currencyCode: "QAR",
      iconKey: "cash",
    },
    {
      name: "Main Bank Account",
      group: "debit",
      subtype: "bank_account",
      currencyCode: "QAR",
      iconKey: "bank_account",
    },
    {
      name: "Savings Account",
      group: "debit",
      subtype: "bank_account",
      currencyCode: "QAR",
      iconKey: "bank_account",
    },
    {
      name: "CBQ Credit Card",
      group: "credit",
      subtype: "credit_card",
      currencyCode: "QAR",
      iconKey: "credit_card",
    },
    {
      name: "UBL PKR Account",
      group: "debit",
      subtype: "bank_account",
      currencyCode: "PKR",
      iconKey: "bank_account",
    },
  ] satisfies Array<{
    name: string;
    group: AccountGroup;
    subtype: AccountSubtype;
    currencyCode: string;
    iconKey: string;
  }>;

  for (const account of accounts) {
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId,
        name: account.name,
      },
      select: { id: true },
    });

    if (existingAccount) {
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          group: account.group,
          subtype: account.subtype,
          currencyCode: account.currencyCode,
          iconKey: account.iconKey,
          balance: new Prisma.Decimal(0),
        },
      });
      continue;
    }

    await prisma.account.create({
      data: {
        userId,
        name: account.name,
        group: account.group,
        subtype: account.subtype,
        currencyCode: account.currencyCode,
        iconKey: account.iconKey,
        balance: new Prisma.Decimal(0),
      },
    });
  }
}

async function seedCategories(userId: string) {
  const categories = [
    // Income
    { name: "Salary", type: "income" },
    { name: "Freelance", type: "income" },
    { name: "Bonus", type: "income" },
    { name: "Commission", type: "income" },
    { name: "Investment Return", type: "income" },
    { name: "Profit", type: "income" },
    { name: "Rental Income", type: "income" },
    { name: "Gift Received", type: "income" },
    { name: "Refund", type: "income" },
    { name: "Loan Received", type: "income" },
    { name: "Borrowed Money Returned", type: "income" },
    { name: "Side Hustle", type: "income" },
    { name: "Business Income", type: "income" },
    { name: "Other Income", type: "income" },

    // Expense
    { name: "Groceries", type: "expense" },
    { name: "Vegetables", type: "expense" },
    { name: "Fruits", type: "expense" },
    { name: "Chicken", type: "expense" },
    { name: "Beef", type: "expense" },
    { name: "Dairy", type: "expense" },
    { name: "Rice", type: "expense" },
    { name: "Transport", type: "expense" },
    { name: "Fuel", type: "expense" },
    { name: "Car Maintenance", type: "expense" },
    { name: "Food", type: "expense" },
    { name: "Dining Out", type: "expense" },
    { name: "Tea & Snacks", type: "expense" },
    { name: "Bills", type: "expense" },
    { name: "Rent", type: "expense" },
    { name: "Utilities", type: "expense" },
    { name: "Internet", type: "expense" },
    { name: "Mobile", type: "expense" },
    { name: "Shopping", type: "expense" },
    { name: "Clothing", type: "expense" },
    { name: "Personal Care", type: "expense" },
    { name: "Medical", type: "expense" },
    { name: "Pharmacy", type: "expense" },
    { name: "Gym & Fitness", type: "expense" },
    { name: "Entertainment", type: "expense" },
    { name: "Subscriptions", type: "expense" },
    { name: "Family Support", type: "expense" },
    { name: "Wife Support", type: "expense" },
    { name: "Parents Support", type: "expense" },
    { name: "Loan Repayment", type: "expense" },
    { name: "Debt Payment", type: "expense" },
    { name: "Savings Transfer", type: "expense" },
    { name: "Investment", type: "expense" },
    { name: "Gifts", type: "expense" },
    { name: "Charity", type: "expense" },
    { name: "Travel", type: "expense" },
    { name: "Hotel", type: "expense" },
    { name: "Visa & Documents", type: "expense" },
    { name: "Home Supplies", type: "expense" },
    { name: "Pet Care", type: "expense" },
    { name: "Education", type: "expense" },
    { name: "Software & Tools", type: "expense" },
    { name: "Other Expense", type: "expense" },
  ] satisfies Array<{
    name: string;
    type: CategoryType;
  }>;

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        userId_name_type: {
          userId,
          name: category.name,
          type: category.type,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        userId,
        name: category.name,
        type: category.type,
        isActive: true,
      },
    });
  }
}

async function seedInventoryCategories(userId: string) {
  const inventoryCategories = [
    { name: "Personal Care", iconKey: "sparkles" },
    { name: "Cleaning", iconKey: "spray" },
    { name: "Groceries", iconKey: "shopping-basket" },
    { name: "Pet Supplies", iconKey: "cat" },
    { name: "Medicine", iconKey: "pill" },
    { name: "Kitchen Essentials", iconKey: "chef-hat" },
    { name: "Beverages", iconKey: "cup-soda" },
    { name: "Baby Care", iconKey: "baby" },
    { name: "Stationery", iconKey: "notebook-pen" },
    { name: "Electronics", iconKey: "cpu" },
    { name: "Laundry", iconKey: "shirt" },
    { name: "Bathroom Supplies", iconKey: "bath" },
  ];

  for (const category of inventoryCategories) {
    await prisma.inventoryCategory.upsert({
      where: {
        userId_name: {
          userId,
          name: category.name,
        },
      },
      update: {
        iconKey: category.iconKey,
        isActive: true,
      },
      create: {
        userId,
        name: category.name,
        iconKey: category.iconKey,
        isActive: true,
      },
    });
  }
}

async function seedInventoryItems(userId: string) {
  const inventoryCategories = await prisma.inventoryCategory.findMany({
    where: { userId },
    select: { id: true, name: true },
  });

  const categoryMap = Object.fromEntries(
    inventoryCategories.map((category) => [category.name, category.id])
  ) as Record<string, string>;

  const items = [
    {
      categoryName: "Personal Care",
      name: "Toothpaste",
      brand: "Colgate",
      unit: "tube",
      currentQuantity: 2,
      minQuantity: 1,
    },
    {
      categoryName: "Personal Care",
      name: "Shampoo",
      brand: "Head & Shoulders",
      unit: "bottle",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Personal Care",
      name: "Body Wash",
      brand: "Nivea",
      unit: "bottle",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Cleaning",
      name: "Dishwashing Liquid",
      brand: "Fairy",
      unit: "bottle",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Cleaning",
      name: "Surface Cleaner",
      brand: "Dettol",
      unit: "bottle",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Laundry",
      name: "Laundry Detergent",
      brand: "Ariel",
      unit: "pack",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Groceries",
      name: "Rice",
      brand: "Falak",
      unit: "bag",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Groceries",
      name: "Flour",
      brand: "Local",
      unit: "bag",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Groceries",
      name: "Cooking Oil",
      brand: "Sufi",
      unit: "bottle",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Kitchen Essentials",
      name: "Salt",
      brand: "National",
      unit: "pack",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Kitchen Essentials",
      name: "Red Chili Powder",
      brand: "National",
      unit: "pack",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Beverages",
      name: "Tea",
      brand: "Lipton",
      unit: "box",
      currentQuantity: 1,
      minQuantity: 1,
    },
    {
      categoryName: "Medicine",
      name: "Panadol",
      brand: "Panadol",
      unit: "box",
      currentQuantity: 2,
      minQuantity: 1,
    },
    {
      categoryName: "Bathroom Supplies",
      name: "Toilet Paper",
      brand: "Fine",
      unit: "pack",
      currentQuantity: 2,
      minQuantity: 1,
    },
    {
      categoryName: "Pet Supplies",
      name: "Cat Food",
      brand: "Whiskas",
      unit: "pack",
      currentQuantity: 2,
      minQuantity: 1,
    },
    {
      categoryName: "Pet Supplies",
      name: "Cat Litter",
      brand: "Local",
      unit: "bag",
      currentQuantity: 1,
      minQuantity: 1,
    },
  ] satisfies Array<{
    categoryName: string;
    name: string;
    brand: string;
    unit: InventoryUnit;
    currentQuantity: number;
    minQuantity: number;
  }>;

  for (const item of items) {
    const categoryId = categoryMap[item.categoryName];

    if (!categoryId) {
      throw new Error(`Inventory category not found: ${item.categoryName}`);
    }

    await prisma.inventoryItem.upsert({
      where: {
        userId_categoryId_name: {
          userId,
          categoryId,
          name: item.name,
        },
      },
      update: {
        brand: item.brand,
        unit: item.unit,
        currentQuantity: new Prisma.Decimal(item.currentQuantity),
        minQuantity: new Prisma.Decimal(item.minQuantity),
        isActive: true,
      },
      create: {
        userId,
        categoryId,
        name: item.name,
        brand: item.brand,
        unit: item.unit,
        currentQuantity: new Prisma.Decimal(item.currentQuantity),
        minQuantity: new Prisma.Decimal(item.minQuantity),
        preferredCurrencyCode: "QAR",
        isActive: true,
      },
    });
  }
}

async function main() {
  const user = await seedUser();

  await seedAccounts(user.id);
  await seedCategories(user.id);
  await seedInventoryCategories(user.id);
  await seedInventoryItems(user.id);

  console.log("Seed data created successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
