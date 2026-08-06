import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, isValidEmail, normalizeEmail, validatePassword } from "./auth";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Andrew@Environics.CA ")).toBe("andrew@environics.ca");
  });
});

describe("isValidEmail", () => {
  it("accepts a plausible email", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
  });

  it("rejects a string without @", () => {
    expect(isValidEmail("nope")).toBe(false);
  });

  it("rejects a domain without a dot", () => {
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("rejects passwords shorter than the minimum", () => {
    expect(validatePassword("short")).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("accepts a password meeting the minimum length", () => {
    expect(validatePassword("longenough")).toBeUndefined();
  });
});
