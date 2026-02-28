import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();

  // Get last brew from brew_logs (single source of truth)
  const lastBrewRows = await sql`
    SELECT
      bl.id,
      bl.brew_method,
      bl.brew_feedback,
      bl.grind_size,
      bl.extraction_grams,
      bl.dose_grams,
      bl.created_at,
      c.coffee_name,
      c.roaster
    FROM brew_logs bl
    JOIN coffees c ON c.id = bl.coffee_id
    ORDER BY bl.created_at DESC
    LIMIT 1
  `;

  // Get suggested dose (sealed doses, prefer not-frozen, best freshness window)
  const suggestedRows = await sql`
    SELECT
      v.id as vial_id,
      v.vial_code,
      v.is_frozen,
      fs.roast_date,
      fs.grams_per_dose,
      c.id as coffee_id,
      c.coffee_name,
      c.roaster,
      c.color,
      dt.name as dose_type_name,
      EXTRACT(DAY FROM NOW() - fs.roast_date)::int as days_since_roast
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL'
    ORDER BY
      v.is_frozen ASC,
      CASE
        WHEN EXTRACT(DAY FROM NOW() - fs.roast_date) BETWEEN 7 AND 21 THEN 0
        WHEN EXTRACT(DAY FROM NOW() - fs.roast_date) < 7 THEN 1
        WHEN EXTRACT(DAY FROM NOW() - fs.roast_date) BETWEEN 22 AND 35 THEN 2
        ELSE 3
      END,
      fs.roast_date DESC
    LIMIT 1
  `;

  // Get frozen doses
  const frozenRows = await sql`
    SELECT
      v.id as vial_id,
      v.vial_code,
      v.frozen_at,
      fs.roast_date,
      fs.grams_per_dose,
      c.id as coffee_id,
      c.coffee_name,
      c.roaster,
      c.color,
      dt.name as dose_type_name
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL' AND v.is_frozen = true
    ORDER BY v.frozen_at DESC
  `;

  // Get inventory snapshot (top 3 coffees by dose count)
  const inventoryRows = await sql`
    SELECT
      c.id as coffee_id,
      c.coffee_name,
      c.roaster,
      c.color,
      dt.name as dose_type_name,
      COUNT(v.id)::int as count
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL'
    GROUP BY c.id, c.coffee_name, c.roaster, c.color, dt.name
    ORDER BY count DESC
    LIMIT 3
  `;

  // Get brewed this week stats (from brew_logs)
  const weekStatsRows = await sql`
    SELECT
      COUNT(*)::int as cups,
      COALESCE(SUM(dose_grams), 0)::numeric as grams
    FROM brew_logs
    WHERE created_at > NOW() - INTERVAL '7 days'
  `;

  // Build response
  const lastBrew = lastBrewRows[0] ? {
    coffeeName: lastBrewRows[0].coffee_name,
    roaster: lastBrewRows[0].roaster,
    brewMethod: lastBrewRows[0].brew_method,
    brewFeedback: lastBrewRows[0].brew_feedback,
    grindSize: lastBrewRows[0].grind_size,
    extractionGrams: parseFloat(lastBrewRows[0].extraction_grams),
    doseGrams: parseFloat(lastBrewRows[0].dose_grams),
    timestamp: lastBrewRows[0].created_at,
  } : null;

  const suggested = suggestedRows[0] ? {
    vialId: suggestedRows[0].vial_id,
    vialCode: suggestedRows[0].vial_code,
    coffeeName: suggestedRows[0].coffee_name,
    roaster: suggestedRows[0].roaster,
    color: suggestedRows[0].color,
    doseTypeName: suggestedRows[0].dose_type_name,
    gramsPerDose: suggestedRows[0].grams_per_dose,
    roastDate: suggestedRows[0].roast_date,
    daysSinceRoast: suggestedRows[0].days_since_roast,
    isFrozen: suggestedRows[0].is_frozen,
  } : null;

  const frozenDoses = frozenRows.map((r) => ({
    vialId: r.vial_id,
    vialCode: r.vial_code,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    color: r.color,
    doseTypeName: r.dose_type_name,
    gramsPerDose: r.grams_per_dose,
    roastDate: r.roast_date,
    frozenAt: r.frozen_at,
  }));

  const inventory = inventoryRows.map((r) => ({
    coffeeId: r.coffee_id,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    color: r.color,
    doseTypeName: r.dose_type_name,
    count: r.count,
  }));

  const weekStats = weekStatsRows[0] ? {
    cups: weekStatsRows[0].cups,
    grams: parseFloat(weekStatsRows[0].grams) || 0,
  } : { cups: 0, grams: 0 };

  return NextResponse.json({
    lastBrew,
    suggested,
    frozenDoses,
    inventory,
    weekStats,
  });
}
