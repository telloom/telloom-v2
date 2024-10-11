export type ActionState = {
  status: "success" | "error";
  message: string;
  data?: any;
  error?: string;
};
