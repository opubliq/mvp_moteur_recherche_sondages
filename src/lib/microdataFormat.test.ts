import { describe, expect, it } from "vitest";
import { refusalCodes } from "./microdataFormat";

describe("refusalCodes", () => {
  it("includes default negative sentinels even when options is empty (scales & continuous)", () => {
    const codes = refusalCodes([]);
    expect(codes).toContain(-99);
    expect(codes).toContain(-98);
    expect(codes).toContain(-999);
    expect(codes).toContain(-1);
  });

  it("detects refusal codes from labels and negative option codes", () => {
    const options = [
      { code: "1", label: "Strongly agree" },
      { code: "2", label: "Agree" },
      { code: "99", label: "Don't know" },
      { code: "-99", label: "Refusal" },
    ];
    const codes = refusalCodes(options);
    expect(codes).toContain("99");
    expect(codes).toContain("-99");
    expect(codes).not.toContain("1");
    expect(codes).not.toContain("2");
  });
});
