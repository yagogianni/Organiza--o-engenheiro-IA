import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { FileDropzone } from "@/components/ui/file-dropzone";

function makeFile(name: string) {
  return new File(["fake"], name, { type: "image/jpeg" });
}

describe("FileDropzone", () => {
  it("calls onFilesSelected with dropped files", () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);
    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });

    const files = [makeFile("foto1.jpg"), makeFile("foto2.jpg")];
    fireEvent.drop(dropzone, { dataTransfer: { files } });

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("calls onFilesSelected when files are chosen via the hidden input", () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);
    const input = screen.getByLabelText(/selecionar fotos/i) as HTMLInputElement;

    const files = [makeFile("foto3.jpg")];
    Object.defineProperty(input, "files", { value: files });
    fireEvent.change(input);

    expect(onFilesSelected).toHaveBeenCalledWith(files);
  });

  it("ignores an empty drop", () => {
    const onFilesSelected = vi.fn();
    render(<FileDropzone onFilesSelected={onFilesSelected} />);
    const dropzone = screen.getByRole("button", { name: /arraste fotos/i });

    fireEvent.drop(dropzone, { dataTransfer: { files: [] } });
    expect(onFilesSelected).not.toHaveBeenCalled();
  });
});
