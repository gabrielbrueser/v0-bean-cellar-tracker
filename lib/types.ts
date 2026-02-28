export interface DoseType {
  id: string;
  name: string;
  gramsPerDose: number;
  prefix: string;
}

export interface Vial {
  id: string;
  vialCode: string;
  doseTypeId: string;
  qrValue: string;
  createdAt: Date;
  status: "FULL" | "EMPTY";
  color: string | null;
  archived: boolean;
  isFrozen: boolean;
  frozenAt: Date | null;
}

export interface Coffee {
  id: string;
  roaster: string;
  coffeeName: string;
  score: number;
  origin: string;
  producer: string;
  variety: string;
  altitude: string;
  tastingNotes: string;
  notes: string;
  link: string;
  processMethodId: string;
  color: string | null;
  archived: boolean;
  createdAt: Date;
}

export interface ProcessMethod {
  id: string;
  name: string;
  isCustom: boolean;
  createdAt: Date;
}

export interface FillSession {
  id: string;
  vialId: string;
  coffeeId: string;
  doseTypeId: string;
  roastDate: string;
  gramsPerDose: number;
  filledAt: Date;
  usedAt?: Date | null;
  status: "FULL" | "USED" | "ARCHIVED";
}

export interface UsageLog {
  id: string;
  fillSessionId: string;
  timestamp: Date;
  brewMethod: string;
  grindSize?: number | null;
  notes: string;
}

export interface BrewLog {
  id: string;
  userId: string | null;
  cellarId: string | null;
  coffeeId: string;
  doseId: string;
  brewMethod: "espresso" | "filter";
  doseGrams: number;
  grindSize: number;
  grindUnit: "espresso-scale" | "comandante-clicks";
  extractionGrams: number;
  brewFeedback: "fast" | "good" | "slow";
  notes: string | null;
  createdAt: Date;
  // Joined fields
  coffeeName?: string;
  roaster?: string;
  vialCode?: string;
  userName?: string;
}

export interface InventoryGroup {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  doseTypeId: string;
  doseTypeName: string;
  gramsPerDose: number;
  count: number;
  vials: Vial[];
}
