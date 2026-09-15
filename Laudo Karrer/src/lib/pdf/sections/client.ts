import type { jsPDF } from "jspdf";
import type { ClientData } from "@/types/laudo";
import { newPage, drawFieldList, type PageCursor } from "@/lib/pdf/pageHelpers";

export function drawClientSection(doc: jsPDF, client: ClientData, cursor: PageCursor): void {
  newPage(doc, "Identificação do Solicitante", cursor);
  drawFieldList(
    doc,
    [
      { label: "Nome / Razão Social", value: client.name },
      { label: "CPF/CNPJ", value: client.document },
      { label: "Endereço", value: client.address },
      { label: "Email", value: client.email ?? "" },
    ],
    35,
  );
}
