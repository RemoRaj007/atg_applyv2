const { prisma } = require("../../config/db");
const ApiError = require("../../utils/ApiError");
const { activityLogger } = require("../../config/atg_logger");

const DEFAULT_OPTIONS = [
  {
    name: "Basic Pack",
    price: 10.00,
    currency: "USD",
    appsCount: 5,
    features: JSON.stringify(["5 extra tailored applications", "Standard support", "Valid indefinitely"]),
    description: "Ideal for quick application boosts.",
    isPopular: false,
    status: "active",
  },
  {
    name: "Standard Pack",
    price: 25.00,
    currency: "USD",
    appsCount: 15,
    features: JSON.stringify(["15 extra tailored applications", "Priority operator matching", "Valid indefinitely"]),
    description: "Most popular choice for active jobseekers.",
    isPopular: true,
    status: "active",
  },
  {
    name: "Professional Pack",
    price: 70.00,
    currency: "USD",
    appsCount: 50,
    features: JSON.stringify(["50 extra tailored applications", "Dedicated account manager", "Priority processing", "Valid indefinitely"]),
    description: "Maximum application power for serious applicants.",
    isPopular: false,
    status: "active",
  },
  {
    name: "Starter Plan",
    price: 60.00,
    currency: "USD",
    appsCount: 50,
    features: JSON.stringify(["50 managed applications", "Application tracker + documents", "Email + WhatsApp updates", "Valid indefinitely"]),
    description: "For students and early-stage jobseekers.",
    isPopular: false,
    status: "active",
  },
  {
    name: "Premium Plan",
    price: 150.00,
    currency: "USD",
    appsCount: 150,
    features: JSON.stringify(["150 managed applications", "Fastest turnaround", "Dedicated specialist", "Roles across multiple countries"]),
    description: "For serious, multi-location job hunts.",
    isPopular: false,
    status: "active",
  },
];

const list = async (requesterRole) => {
  const where = { d_status: "active" };
  if (requesterRole !== "admin") {
    where.status = "active";
  }
  let options = await prisma.paymentOption.findMany({
    where,
    orderBy: [{ isPopular: "desc" }, { price: "asc" }],
  });

  if (options.length === 0) {
    await prisma.paymentOption.createMany({ data: DEFAULT_OPTIONS });
    options = await prisma.paymentOption.findMany({
      where,
      orderBy: [{ isPopular: "desc" }, { price: "asc" }],
    });
  }

  return options;
};

const getById = async (id) => {
  const option = await prisma.paymentOption.findFirst({
    where: { id: Number(id), d_status: "active" },
  });
  if (!option) throw ApiError.notFound("Payment option not found");
  return option;
};

const create = async (data) => {
  const option = await prisma.paymentOption.create({
    data: {
      name: data.name,
      price: Number(data.price),
      currency: data.currency || "USD",
      appsCount: Number(data.appsCount || 0),
      features: typeof data.features === "object" ? JSON.stringify(data.features) : (data.features || "[]"),
      description: data.description || null,
      isPopular: Boolean(data.isPopular),
      status: data.status || "active",
    },
  });
  activityLogger.activity("Payment option created", { id: option.id, name: option.name, price: option.price });
  return option;
};

const update = async (id, data) => {
  const existing = await prisma.paymentOption.findFirst({
    where: { id: Number(id), d_status: "active" },
  });
  if (!existing) throw ApiError.notFound("Payment option not found");

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.price !== undefined) updateData.price = Number(data.price);
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.appsCount !== undefined) updateData.appsCount = Number(data.appsCount);
  if (data.features !== undefined) {
    updateData.features = typeof data.features === "object" ? JSON.stringify(data.features) : data.features;
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isPopular !== undefined) updateData.isPopular = Boolean(data.isPopular);
  if (data.status !== undefined) updateData.status = data.status;

  const updated = await prisma.paymentOption.update({
    where: { id: Number(id) },
    data: updateData,
  });
  activityLogger.activity("Payment option updated", { id: updated.id, fields: Object.keys(updateData) });
  return updated;
};

const remove = async (id) => {
  const existing = await prisma.paymentOption.findFirst({
    where: { id: Number(id), d_status: "active" },
  });
  if (!existing) throw ApiError.notFound("Payment option not found");

  await prisma.paymentOption.update({
    where: { id: Number(id) },
    data: { d_status: "deleted" },
  });
  activityLogger.activity("Payment option deleted", { id: Number(id) });
  return { message: "Payment option deleted successfully" };
};

module.exports = { list, getById, create, update, remove };
