import { maskCpfCnpj, isValidCpfCnpjLength } from "@/lib/masks";

describe("maskCpfCnpj", () => {
  it("masks an 11-digit CPF as 000.000.000-00", () => {
    expect(maskCpfCnpj("12345678900")).toBe("123.456.789-00");
  });

  it("masks a partial CPF while typing", () => {
    expect(maskCpfCnpj("123456")).toBe("123.456");
  });

  it("masks a 14-digit CNPJ as 00.000.000/0000-00", () => {
    expect(maskCpfCnpj("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("strips non-digit characters before masking", () => {
    expect(maskCpfCnpj("123.456.789-00")).toBe("123.456.789-00");
  });

  it("truncates input beyond 14 digits", () => {
    expect(maskCpfCnpj("123456789001234567")).toBe("12.345.678/9001-23");
  });
});

describe("isValidCpfCnpjLength", () => {
  it("accepts 11 digits (CPF)", () => {
    expect(isValidCpfCnpjLength("123.456.789-00")).toBe(true);
  });

  it("accepts 14 digits (CNPJ)", () => {
    expect(isValidCpfCnpjLength("12.345.678/0001-99")).toBe(true);
  });

  it("rejects any other length", () => {
    expect(isValidCpfCnpjLength("123")).toBe(false);
  });
});
