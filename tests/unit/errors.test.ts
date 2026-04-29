import { AppError, ValidationError } from "../../src/utils/errors";

describe("errors", () => {
  it("AppError carries status and details", () => {
    const err = new AppError("x", 418, { a: 1 });
    expect(err.statusCode).toBe(418);
    expect(err.details).toEqual({ a: 1 });
  });

  it("ValidationError defaults to 400", () => {
    const err = new ValidationError("bad");
    expect(err.statusCode).toBe(400);
  });
});
