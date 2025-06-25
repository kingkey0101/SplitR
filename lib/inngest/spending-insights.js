import { ConvexHttpClient } from "convex/browser";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export const spendingInsights = inngest.createFunction(
  { name: "Generate Spending Insights", id: "generate-spending-insights" },
  { cron: "0 10 * * *" },
  async ({ step }) => {}
);
