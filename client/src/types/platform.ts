export type Role = "client" | "admin" | "lawyer";
export interface SessionUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role: Role;
  authorityLetter?: string;
  authorityStatus?: string;
}
export interface WorkflowMatter {
  _id: string;
  noticeId: string;
  subject: string;
  clientName?: string;
  paymentStatus: string;
  status: string;
  workflow: { step: number; owner: Role | null; label: string;nextAction?:string;whatHappensNext?:string;section?:string;updateNote?:string;nextUpdateAt?:string|null;updatedAt?:string };
}
export interface ExtractionResult {
  fileName: string;
  originalName: string;
  format: "pdf" | "docx";
  text: string;
  pages?: number;
  truncated: boolean;
  method: "local-text-extraction";
}
export interface AiFacts {
  summary: string;
  parties: string[];
  dates: string[];
  amounts: string[];
  obligations: string[];
  missingInformation: string[];
  sourceQuotes: string[];
}
