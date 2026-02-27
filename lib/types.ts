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
  status: "FULL" | "USED" | "ARCHIVED";
}

export interface UsageLog {
  id: string;
  fillSessionId: string;
  timestamp: Date;
  brewMethod: string;
  notes: string;
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
