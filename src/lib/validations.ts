import { z } from "zod";
import { planFeaturesSchema } from "@/lib/plan-features";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(32),
  planId: z.string().min(1),
  password: z.string().min(8).max(120).optional(),
  machineId: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().min(7).max(32),
});

export const createPlanSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
  durationDays: z.coerce.number().int().min(1).max(3650),
  features: planFeaturesSchema,
});

export const updatePlanSchema = createPlanSchema;

export const createMachineSchema = z.object({
  machineId: z.string().optional(),
  firmwareVersion: z.string().trim().max(40).optional(),
});

export const assignMachineSchema = z.object({
  machineId: z.string().min(1),
  customerId: z.string().min(1),
});

export const changePlanSchema = z.object({
  customerId: z.string().min(1),
  planId: z.string().min(1),
});

export const customerLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const pairMachineSchema = z.object({
  machineId: z.string().min(1),
});

export const paginationSchema = z.object({
  q: z.string().optional().default(""),
  status: z.string().optional().default(""),
  planId: z.string().optional().default(""),
  event: z.string().optional().default(""),
  actor: z.string().optional().default(""),
  from: z.string().optional().default(""),
  to: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(120).optional(),
});
