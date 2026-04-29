import { buildRouteFilterWhere } from "../../src/repositories/route.repository";
import { listRoutesQuerySchema } from "../../src/dtos/routes.dto";

describe("buildRouteFilterWhere", () => {
  it("includes isDeleted false", () => {
    const where = buildRouteFilterWhere(listRoutesQuerySchema.parse({}));
    expect(where.isDeleted).toBe(false);
  });

  it("adds origin city filter", () => {
    const where = buildRouteFilterWhere(
      listRoutesQuerySchema.parse({ origin_city: "Bogotá" }),
    );
    expect(where.originCity).toMatchObject({
      equals: "Bogotá",
      mode: "insensitive",
    });
  });
});
