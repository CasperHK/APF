import { treaty } from "@elysiajs/eden";
import type { App } from "./api-types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export const api = treaty<App>(API_BASE);
