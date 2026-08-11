export interface Feedback {
  id: number;
  name: string;
  contact: string;
  type: "BUG" | "SUGGESTION" | "OTHER";
  message: string;
  createdAt: string;
  read: boolean;
}
