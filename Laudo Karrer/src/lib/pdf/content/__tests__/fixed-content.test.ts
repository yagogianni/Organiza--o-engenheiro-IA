import { INSTRUMENTS } from "@/lib/pdf/content/instruments";
import { GLOSSARY } from "@/lib/pdf/content/glossary";
import { REFERENCES } from "@/lib/pdf/content/references";

describe("PDF fixed content", () => {
  it("has all 6 instruments", () => {
    expect(INSTRUMENTS).toHaveLength(6);
    expect(INSTRUMENTS).toContain("Fissurômetro");
  });

  it("has the full 65-term glossary in alphabetical order, A to V", () => {
    expect(GLOSSARY).toHaveLength(65);
    expect(GLOSSARY[0].term).toBe("ANOMALIA");
    expect(GLOSSARY[GLOSSARY.length - 1].term).toBe("VISTORIA CAUTELAR");
    expect(GLOSSARY.every((g) => g.term.length > 0 && g.definition.length > 0)).toBe(true);
  });

  it("has the 5 fixed references", () => {
    expect(REFERENCES).toHaveLength(5);
    expect(REFERENCES).toContain("ABNT NBR 6118");
  });
});
