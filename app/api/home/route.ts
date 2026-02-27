import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();

  // Get last brew
  const lastBrewRows = await sql`
    SELECT
      ul.id,
      ul.timestamp,
      ul.brew_method,
      ul.notes,
      ul.grind_size,
      fs.roast_date,
      c.coffee_name,
      c.roaster
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    JOIN coffees c ON c.id = fs.coffee_id
    ORDER BY ul.timestamp DESC
    LIMIT 1
  `;

  // Get suggested dose (sealed doses, prefer peak freshness)
  // Peak freshness: 7-21 days from roast
  const suggestedRows = await sql`
    SELECT
      v.id as vial_id,
      v.vial_code,
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
      CASE
        WHEN EXTRACT(DAY FROM NOW() - fs.roast_date) BETWEEN 7 AND 21 THEN 0
        WHEN EXTRACT(DAY FROM NOW() - fs.roast_date) < 7 THEN 1
        WHEN EXTRACT(DAY FROM NOW() - fs.roast_date) BETWEEN 22 AND 35 THEN 2
        ELSE 3
      END,
      fs.roast_date DESC
    LIMIT 1
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

  // Get go-to coffee (most brewed this month)
  const goToRows = await sql`
    SELECT
      c.id as coffee_id,
      c.coffee_name,
      c.roaster,
      COUNT(ul.id)::int as brew_count
    FROM usage_logs ul
    JOIN fill_sessions fs ON fs.id = ul.fill_session_id
    JOIN coffees c ON c.id = fs.coffee_id
    WHERE ul.timestamp > NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.coffee_name, c.roaster
    ORDER BY brew_count DESC
    LIMIT 1
  `;

  // Get freshness summary (count of coffees at peak)
  const freshnessRows = await sql`
    SELECT COUNT(DISTINCT c.id)::int as peak_count
    FROM fill_sessions fs
    JOIN coffees c ON c.id = fs.coffee_id
    WHERE fs.status = 'FULL'
      AND EXTRACT(DAY FROM NOW() - fs.roast_date) BETWEEN 7 AND 21
  `;

  // Build response
  const lastBrew = lastBrewRows[0] ? {
    coffeeName: lastBrewRows[0].coffee_name,
    roaster: lastBrewRows[0].roaster,
    brewMethod: lastBrewRows[0].brew_method,
    timestamp: lastBrewRows[0].timestamp,
    notes: lastBrewRows[0].notes,
    grindSize: lastBrewRows[0].grind_size,
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
  } : null;

  const inventory = inventoryRows.map((r) => ({
    coffeeId: r.coffee_id,
    coffeeName: r.coffee_name,
    roaster: r.roaster,
    color: r.color,
    doseTypeName: r.dose_type_name,
    count: r.count,
  }));

  const goTo = goToRows[0] && goToRows[0].brew_count >= 3 ? {
    coffeeId: goToRows[0].coffee_id,
    coffeeName: goToRows[0].coffee_name,
    roaster: goToRows[0].roaster,
    brewCount: goToRows[0].brew_count,
  } : null;

  const peakFreshnessCount = freshnessRows[0]?.peak_count || 0;

  return NextResponse.json({
    lastBrew,
    suggested,
    inventory,
    goTo,
    peakFreshnessCount,
  });
}
