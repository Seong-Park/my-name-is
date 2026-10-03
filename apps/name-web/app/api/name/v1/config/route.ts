import {
  locations,
  regions,
} from "../../../../../../../packages/bazi-application/src/reference/locations";
import { koreaNow } from "../../../../../lib/contracts";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    {
      minDate: "1900-01-01",
      maxDate: [koreaNow().slice(0, 10), "2026-12-31"].sort()[0],
      locationVersion: "kma-2026-07-01-v1",
      regions,
      cities: locations.map((l) => ({
        id: l.cityId,
        name: l.districtName,
        regionId: l.regionId,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
