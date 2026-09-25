import { z } from "zod";

export const planFeaturesSchema = z.object({
  maxDevices: z.number().int().min(1).max(50).default(1),
  monthlyExportLimit: z.number().int().min(0).nullable().default(null),
  unlimitedExports: z.boolean().default(false),
  maxStorageMb: z.number().int().min(0).default(1024),
  maxResolution: z.enum(["standard", "hd", "ultraHd"]).default("standard"),
  maxVideoMinutes: z.number().int().min(0).default(60),
  premiumFeatures: z.boolean().default(false),
});

export type PlanFeatures = z.infer<typeof planFeaturesSchema>;

export const defaultPlanFeatures = (): PlanFeatures => planFeaturesSchema.parse({});

export function parsePlanFeatures(raw: string | null | undefined): PlanFeatures {
  if (!raw) return defaultPlanFeatures();
  try {
    return planFeaturesSchema.parse(JSON.parse(raw));
  } catch {
    return defaultPlanFeatures();
  }
}

export function serializePlanFeatures(features: PlanFeatures): string {
  return JSON.stringify(planFeaturesSchema.parse(features));
}
