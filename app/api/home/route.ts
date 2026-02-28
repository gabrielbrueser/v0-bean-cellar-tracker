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
      c.roaster,
      v.vial_code
    FROM brew_logs bl
    JOIN coffees c ON c.id = bl.coffee_id
    LEFT JOIN vials v ON v.id = bl.dose_id
    ORDER BY bl.created_at DESC
    LIMIT 1
  `;

  // Get peak dose count for subtitle
  const peakDoseCountRows = await sql`
    SELECT COUNT(*)::int as count
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    WHERE fs.status = 'FULL'
      AND v.is_frozen = false
      AND EXTRACT(DAY FROM NOW() - fs.roast_date) BETWEEN 7 AND 21
  `;

  // Get frozen dose count for subtitle
  const frozenCountRows = await sql`
    SELECT COUNT(*)::int as count
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    WHERE fs.status = 'FULL' AND v.is_frozen = true
  `;

  // Get hero recommendations - one per method (espresso/filter)
  // Rules: not stale, prefer not frozen, oldest sealed first (FIFO)
  const heroEspressoRows = await sql`
    SELECT
      v.id as vial_id,
      v.vial_code,
      v.is_frozen,
      fs.roast_date,
      fs.grams_per_dose,
      fs.sealed_at,
      c.id as coffee_id,
      c.coffee_name,
      c.roaster,
      c.origin_country,
      c.color,
      dt.name as dose_type_name,
      dt.prefix,
      EXTRACT(DAY FROM NOW() - fs.roast_date)::int as days_since_roast
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL'
      AND dt.prefix IN ('ESP', 'espresso')
      AND EXTRACT(DAY FROM NOW() - fs.roast_date) <= 35
    ORDER BY
      v.is_frozen ASC,
      fs.sealed_at ASC
    LIMIT 1
  `;

  const heroFilterRows = await sql`
    SELECT
      v.id as vial_id,
      v.vial_code,
      v.is_frozen,
      fs.roast_date,
      fs.grams_per_dose,
      fs.sealed_at,
      c.id as coffee_id,
      c.coffee_name,
      c.roaster,
      c.origin_country,
      c.color,
      dt.name as dose_type_name,
      dt.prefix,
      EXTRACT(DAY FROM NOW() - fs.roast_date)::int as days_since_roast
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL'
      AND dt.prefix IN ('FLT', 'filter')
      AND EXTRACT(DAY FROM NOW() - fs.roast_date) <= 35
    ORDER BY
      v.is_frozen ASC,
      fs.sealed_at ASC
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
      dt.name as dose_type_name,
      dt.prefix
    FROM fill_sessions fs
    JOIN vials v ON v.id = fs.vial_id
    JOIN coffees c ON c.id = fs.coffee_id
    JOIN dose_types dt ON dt.id = fs.dose_type_id
    WHERE fs.status = 'FULL' AND v.is_frozen = true
    ORDER BY v.frozen_at DESC
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

  // Get brewed this month stats (from brew_logs)
  const monthStatsRows = await sql`
    SELECT
      COUNT(*)::int as cups,
      COALESCE(SUM(dose_grams), 0)::numeric as grams
    FROM brew_logs
    WHERE created_at >= DATE_TRUNC('month', NOW())
  `;

  // Build response
  const lastBrew = lastBrewRows[0] ? {
    id: lastBrewRows[0].id,
    coffeeName: lastBrewRows[0].coffee_name,
    roaster: lastBrewRows[0].roaster,
    vialCode: lastBrewRows[0].vial_code,
    brewMethod: lastBrewRows[0].brew_method,
    brewFeedback: lastBrewRows[0].brew_feedback,
    grindSize: lastBrewRows[0].grind_size,
    extractionGrams: parseFloat(lastBrewRows[0].extraction_grams),
    doseGrams: parseFloat(lastBrewRows[0].dose_grams),
    timestamp: lastBrewRows[0].created_at,
  } : null;

  const mapHeroRow = (row: Record<string, unknown>) => ({
    vialId: row.vial_id as string,
    vialCode: row.vial_code as string,
    coffeeId: row.coffee_id as string,
    coffeeName: row.coffee_name as string,
    roaster: row.roaster as string,
    originCountry: row.origin_country as string | null,
    color: row.color as string | null,
    doseTypeName: row.dose_type_name as string,
    method: (row.prefix as string)?.toLowerCase().includes('esp') ? 'espresso' : 'filter',
    gramsPerDose: row.grams_per_dose as number,
    roastDate: row.roast_date as string,
    daysSinceRoast: row.days_since_roast as number,
    isFrozen: row.is_frozen as boolean,
  });

  // Build hero recommendations (up to 2 cards)
  const heroRecommendations: ReturnType<typeof mapHeroRow>[] = [];
  if (heroEspressoRows[0]) {
    heroRecommendations.push(mapHeroRow(heroEspressoRows[0]));
  }
  if (heroFilterRows[0]) {
    heroRecommendations.push(mapHeroRow(heroFilterRows[0]));
  }
  // If only one method exists, could add second of same method (spec says this)
  // For now, we show what we have

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

  const weekStats = weekStatsRows[0] ? {
    cups: weekStatsRows[0].cups,
    grams: parseFloat(weekStatsRows[0].grams) || 0,
  } : { cups: 0, grams: 0 };

  const monthStats = monthStatsRows[0] ? {
    cups: monthStatsRows[0].cups,
    grams: parseFloat(monthStatsRows[0].grams) || 0,
  } : { cups: 0, grams: 0 };

  return NextResponse.json({
    lastBrew,
    heroRecommendations,
    frozenDoses,
    weekStats,
    monthStats,
    peakDoseCount: peakDoseCountRows[0]?.count || 0,
    frozenDoseCount: frozenCountRows[0]?.count || 0,
  });
}
