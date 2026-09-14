import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { StepPhotos } from "@/pages/steps/StepPhotos";
import * as imageCompression from "@/lib/imageCompression";
import type { PhotoItem } from "@/types/laudo";

function makeFile(name: string) {
  return new File(["fake"], name, { type: "image/jpeg" });
}

/** Mimics real usage: a parent that actually applies onChange back into props. */
function ControlledStepPhotos({
  initialPhotos,
  onChangeSpy,
}: {
  initialPhotos: PhotoItem[];
  onChangeSpy: (photos: PhotoItem[]) => void;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  return (
    <StepPhotos
      photos={photos}
      onChange={(p) => {
        setPhotos(p);
        onChangeSpy(p);
      }}
      onNext={vi.fn()}
      onBack={vi.fn()}
    />
  );
}

describe("StepPhotos", () => {
  beforeEach(() => {
    vi.spyOn(imageCompression, "compressImageFile").mockResolvedValue("data:image/jpeg;base64,FAKE");
  });

  it("compresses and adds dropped photos, numbered from 1", async () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={[]} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile("a.jpg"), makeFile("b.jpg")] } });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const [added] = onChange.mock.calls[0] as [PhotoItem[]];
    expect(added.map((p) => p.order)).toEqual([1, 2]);
    expect(added.every((p) => p.dataUrl === "data:image/jpeg;base64,FAKE")).toBe(true);
  });

  const existingPhotos: PhotoItem[] = [
    { id: "p1", dataUrl: "data:1", caption: "", order: 1 },
    { id: "p2", dataUrl: "data:2", caption: "", order: 2 },
  ];

  it("updates a photo's caption", () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={existingPhotos} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    fireEvent.change(screen.getAllByPlaceholderText(/legenda/i)[0], { target: { value: "Fachada norte" } });

    expect(onChange).toHaveBeenCalledWith([
      { ...existingPhotos[0], caption: "Fachada norte" },
      existingPhotos[1],
    ]);
  });

  it("removes a photo and renumbers the rest", () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={existingPhotos} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));

    expect(onChange).toHaveBeenCalledWith([{ ...existingPhotos[1], order: 1 }]);
  });

  it("removes all photos", () => {
    const onChange = vi.fn();
    render(<StepPhotos photos={existingPhotos} onChange={onChange} onNext={vi.fn()} onBack={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /remover todas/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("does not revert a removal made while another photo is still compressing", async () => {
    const onChangeSpy = vi.fn();
    let resolveCompression!: (value: string) => void;
    const pending = new Promise<string>((resolve) => {
      resolveCompression = resolve;
    });
    vi.spyOn(imageCompression, "compressImageFile").mockReturnValue(pending);

    render(<ControlledStepPhotos initialPhotos={existingPhotos} onChangeSpy={onChangeSpy} />);

    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });
    fireEvent.drop(dropzone, { dataTransfer: { files: [makeFile("c.jpg")] } });

    // While the drop's compression is still pending, remove photo 1 (p1).
    fireEvent.click(screen.getByRole("button", { name: /remover foto 1/i }));
    expect(onChangeSpy).toHaveBeenCalledWith([{ ...existingPhotos[1], order: 1 }]);

    // Now let the pending compression resolve.
    resolveCompression("data:image/jpeg;base64,NEW");
    await waitFor(() => expect(onChangeSpy).toHaveBeenCalledTimes(2));

    const finalPhotos = onChangeSpy.mock.calls[1][0] as PhotoItem[];
    // p1 must stay removed — the drop's onChange must not resurrect it from a stale snapshot.
    expect(finalPhotos.map((p) => p.id)).not.toContain("p1");
    expect(finalPhotos.map((p) => p.id)).toContain("p2");
    expect(finalPhotos.map((p) => p.order)).toEqual([1, 2]);
  });

  it("calls onNext and onBack", () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    render(<StepPhotos photos={[]} onChange={vi.fn()} onNext={onNext} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: /avançar/i }));
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onNext).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });
});
