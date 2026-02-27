import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  DoseType,
  Vial,
  Coffee,
  ProcessMethod,
  FillSession,
  UsageLog,
} from "./types";

// ─── Seed / Init ───────────────────────────────────────────

const DEFAULT_DOSE_TYPES: Omit<DoseType, "id">[] = [
  { name: "Espresso", gramsPerDose: 18, prefix: "ESP" },
  { name: "Filter", gramsPerDose: 12, prefix: "FLT" },
];

const DEFAULT_PROCESSES = [
  "Washed",
  "Natural",
  "Honey",
  "Anaerobic",
  "Carbonic Maceration",
  "Wet Hulled",
  "Double Washed",
  "Extended Fermentation",
];

export async function seedDefaults() {
  // Seed dose types
  for (const dt of DEFAULT_DOSE_TYPES) {
    const ref = doc(db, "doseTypes", dt.prefix.toLowerCase());
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, dt);
    }
  }

  // Seed counters
  for (const dt of DEFAULT_DOSE_TYPES) {
    const ref = doc(db, "counters", dt.prefix);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { nextNumber: 1 });
    }
  }

  // Seed process methods
  for (const name of DEFAULT_PROCESSES) {
    const q = query(
      collection(db, "processMethods"),
      where("name", "==", name)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      await addDoc(collection(db, "processMethods"), {
        name,
        isCustom: false,
        createdAt: serverTimestamp(),
      });
    }
  }
}

// ─── Dose Types ────────────────────────────────────────────

export async function getDoseTypes(): Promise<DoseType[]> {
  const snap = await getDocs(collection(db, "doseTypes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DoseType));
}

// ─── Process Methods ───────────────────────────────────────

export async function getProcessMethods(): Promise<ProcessMethod[]> {
  const q = query(
    collection(db, "processMethods"),
    orderBy("isCustom", "asc"),
    orderBy("name", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      } as ProcessMethod)
  );
}

export async function addProcessMethod(name: string): Promise<ProcessMethod> {
  const ref = await addDoc(collection(db, "processMethods"), {
    name,
    isCustom: true,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, name, isCustom: true, createdAt: new Date() };
}

// ─── Vials ─────────────────────────────────────────────────

export async function createVial(doseTypeId: string): Promise<Vial> {
  const dtSnap = await getDoc(doc(db, "doseTypes", doseTypeId));
  if (!dtSnap.exists()) throw new Error("Dose type not found");
  const dt = dtSnap.data() as Omit<DoseType, "id">;

  const vial = await runTransaction(db, async (transaction) => {
    const counterRef = doc(db, "counters", dt.prefix);
    const counterSnap = await transaction.get(counterRef);
    if (!counterSnap.exists()) throw new Error("Counter not found");

    const nextNumber = counterSnap.data().nextNumber as number;
    const code = `${dt.prefix}-${String(nextNumber).padStart(3, "0")}`;

    const vialRef = doc(collection(db, "vials"));
    const qrValue = `vial:${vialRef.id}`;

    const vialData = {
      vialCode: code,
      doseTypeId,
      qrValue,
      createdAt: Timestamp.now(),
      status: "EMPTY" as const,
    };

    transaction.set(vialRef, vialData);
    transaction.update(counterRef, { nextNumber: nextNumber + 1 });

    return { id: vialRef.id, ...vialData, createdAt: new Date() };
  });

  return vial;
}

export async function getVials(): Promise<Vial[]> {
  const snap = await getDocs(
    query(collection(db, "vials"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      } as Vial)
  );
}

export async function getVial(id: string): Promise<Vial | null> {
  const snap = await getDoc(doc(db, "vials", id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
  } as Vial;
}

export async function getVialByQr(qrValue: string): Promise<Vial | null> {
  const vialId = qrValue.startsWith("vial:") ? qrValue.slice(5) : qrValue;
  return getVial(vialId);
}

// ─── Coffees ───────────────────────────────────────────────

export async function getCoffees(): Promise<Coffee[]> {
  const snap = await getDocs(
    query(collection(db, "coffees"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      } as Coffee)
  );
}

export async function getCoffee(id: string): Promise<Coffee | null> {
  const snap = await getDoc(doc(db, "coffees", id));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data(),
    createdAt: snap.data().createdAt?.toDate?.() ?? new Date(),
  } as Coffee;
}

export async function createCoffee(
  data: Omit<Coffee, "id" | "createdAt">
): Promise<Coffee> {
  const ref = await addDoc(collection(db, "coffees"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date() };
}

export async function updateCoffee(
  id: string,
  data: Partial<Omit<Coffee, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "coffees", id), data);
}

// ─── Fill Sessions ─────────────────────────────────────────

export async function fillVial(
  vialId: string,
  coffeeId: string,
  doseTypeId: string,
  roastDate: string
): Promise<FillSession> {
  // Check for existing FULL session
  const existing = await getActiveFillSession(vialId);
  if (existing) {
    // Archive the existing session
    await updateDoc(doc(db, "fillSessions", existing.id), {
      status: "ARCHIVED",
    });
  }

  const ref = await addDoc(collection(db, "fillSessions"), {
    vialId,
    coffeeId,
    doseTypeId,
    roastDate,
    filledAt: serverTimestamp(),
    status: "FULL",
  });

  // Update vial status
  await updateDoc(doc(db, "vials", vialId), { status: "FULL" });

  return {
    id: ref.id,
    vialId,
    coffeeId,
    doseTypeId,
    roastDate,
    filledAt: new Date(),
    status: "FULL",
  };
}

export async function getActiveFillSession(
  vialId: string
): Promise<FillSession | null> {
  const q = query(
    collection(db, "fillSessions"),
    where("vialId", "==", vialId),
    where("status", "==", "FULL")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return {
    id: d.id,
    ...d.data(),
    filledAt: d.data().filledAt?.toDate?.() ?? new Date(),
  } as FillSession;
}

export async function getFillSessionsForVial(
  vialId: string
): Promise<FillSession[]> {
  const q = query(
    collection(db, "fillSessions"),
    where("vialId", "==", vialId),
    orderBy("filledAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
        filledAt: d.data().filledAt?.toDate?.() ?? new Date(),
      } as FillSession)
  );
}

export async function useVial(fillSessionId: string, vialId: string): Promise<void> {
  await updateDoc(doc(db, "fillSessions", fillSessionId), { status: "USED" });
  await updateDoc(doc(db, "vials", vialId), { status: "EMPTY" });
  await addDoc(collection(db, "usageLogs"), {
    fillSessionId,
    timestamp: serverTimestamp(),
    brewMethod: "",
    notes: "",
  });
}

// ─── Usage Logs ────────────────────────────────────────────

export async function getUsageLogsForSession(
  fillSessionId: string
): Promise<UsageLog[]> {
  const q = query(
    collection(db, "usageLogs"),
    where("fillSessionId", "==", fillSessionId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(
    (d) =>
      ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.() ?? new Date(),
      } as UsageLog)
  );
}

// ─── Inventory ─────────────────────────────────────────────

export async function getInventorySummary() {
  const [vials, coffees, doseTypes, fillSessionsSnap] = await Promise.all([
    getVials(),
    getCoffees(),
    getDoseTypes(),
    getDocs(
      query(
        collection(db, "fillSessions"),
        where("status", "==", "FULL")
      )
    ),
  ]);

  const fillSessions = fillSessionsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as (FillSession & { id: string })[];

  const groups: Record<
    string,
    {
      coffeeId: string;
      coffeeName: string;
      roaster: string;
      doseTypeId: string;
      doseTypeName: string;
      gramsPerDose: number;
      count: number;
      vials: Vial[];
    }
  > = {};

  for (const fs of fillSessions) {
    const key = `${fs.coffeeId}__${fs.doseTypeId}`;
    const coffee = coffees.find((c) => c.id === fs.coffeeId);
    const doseType = doseTypes.find((dt) => dt.id === fs.doseTypeId);
    const vial = vials.find((v) => v.id === fs.vialId);

    if (!coffee || !doseType || !vial) continue;

    if (!groups[key]) {
      groups[key] = {
        coffeeId: coffee.id,
        coffeeName: coffee.coffeeName,
        roaster: coffee.roaster,
        doseTypeId: doseType.id,
        doseTypeName: doseType.name,
        gramsPerDose: doseType.gramsPerDose,
        count: 0,
        vials: [],
      };
    }

    groups[key].count += 1;
    groups[key].vials.push(vial);
  }

  return Object.values(groups).sort((a, b) =>
    a.coffeeName.localeCompare(b.coffeeName)
  );
}
