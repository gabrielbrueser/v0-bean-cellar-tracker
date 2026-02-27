import { generateText, Output } from "ai";
import { z } from "zod";

const coffeeDataSchema = z.object({
  coffeeName: z.string().nullable().describe("The name of the coffee"),
  roaster: z.string().nullable().describe("The roaster or brand name"),
  origin: z.string().nullable().describe("Country or region of origin"),
  producer: z
    .string()
    .nullable()
    .describe("Farm name, producer, or washing station"),
  variety: z
    .string()
    .nullable()
    .describe("Coffee variety (e.g., Gesha, Bourbon, Typica)"),
  altitude: z
    .string()
    .nullable()
    .describe("Altitude or elevation (e.g., 1800-2000m or 1800 masl)"),
  processMethod: z
    .string()
    .nullable()
    .describe(
      "Processing method (e.g., Washed, Natural, Honey, Anaerobic, etc.)"
    ),
  tastingNotes: z
    .string()
    .nullable()
    .describe("Flavor notes or tasting descriptors"),
  score: z
    .number()
    .nullable()
    .describe("SCA score or cup score if mentioned"),
});

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 });
    }

    const { output } = await generateText({
      model: "anthropic/claude-sonnet-4.6",
      output: Output.object({
        schema: coffeeDataSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this coffee bag label image and extract the following information if visible:
- Coffee name
- Roaster/brand name  
- Origin (country or region)
- Producer/farm/washing station
- Coffee variety
- Altitude
- Processing method
- Tasting notes/flavor descriptors
- Cup score (if shown)

Extract only what you can clearly see on the label. Return null for any fields that are not visible or cannot be determined from the image.`,
            },
            {
              type: "image",
              image: image,
            },
          ],
        },
      ],
    });

    return Response.json({ data: output });
  } catch (error) {
    console.error("Label scan error:", error);
    return Response.json(
      { error: "Failed to analyze label" },
      { status: 500 }
    );
  }
}
