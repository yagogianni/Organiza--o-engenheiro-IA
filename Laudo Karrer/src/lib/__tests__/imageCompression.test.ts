import { beforeEach, afterEach, vi } from "vitest";
import { calculateTargetDimensions, compressImageFile } from "@/lib/imageCompression";

describe("calculateTargetDimensions", () => {
  it("keeps original size when already within max width", () => {
    expect(calculateTargetDimensions(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("scales down proportionally when wider than max width", () => {
    expect(calculateTargetDimensions(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("uses 1600 as the default max width", () => {
    expect(calculateTargetDimensions(3200, 1600)).toEqual({ width: 1600, height: 800 });
  });
});

describe("compressImageFile", () => {
  const OriginalImage = globalThis.Image;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    class FakeImage {
      width = 3000;
      height = 2000;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    // @ts-expect-error test stub replaces the global Image constructor
    globalThis.Image = FakeImage;

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/jpeg;base64,FAKE");
  });

  afterEach(() => {
    globalThis.Image = OriginalImage;
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("resolves with a compressed JPEG data URL", async () => {
    const file = new File(["fake-bytes"], "foto.jpg", { type: "image/jpeg" });
    const result = await compressImageFile(file);
    expect(result).toBe("data:image/jpeg;base64,FAKE");
  });

  it("calls toDataURL with jpeg mime type and the given quality", async () => {
    const file = new File(["fake-bytes"], "foto.jpg", { type: "image/jpeg" });
    await compressImageFile(file, 0.5);
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.5);
  });
});
