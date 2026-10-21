import type { DailyContent, Intention, Prayer } from "./types";
import { prayers as bundledPrayers } from "./data";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL === undefined
    ? "http://localhost:8000/api"
    : process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error(
      "Prayer intentions require a configured Django API and MongoDB. GitHub Pages only hosts the static site.",
    );
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return body;
}

export async function fetchPrayers(): Promise<Prayer[]> {
  if (!API_URL) {
    return bundledPrayers;
  }

  const result = await request<{ prayers: Prayer[] }>("/prayers/");
  return result.prayers;
}

export async function fetchDaily(): Promise<DailyContent> {
  return request<DailyContent>("/daily/");
}

export async function fetchIntentions(): Promise<Intention[]> {
  const result = await request<{ intentions: Intention[] }>("/intentions/");
  return result.intentions;
}

export async function createIntention(text: string): Promise<Intention> {
  const result = await request<{ intention: Intention }>("/intentions/", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return result.intention;
}

export async function deleteIntention(id: string): Promise<void> {
  await request<{ deleted: boolean }>(`/intentions/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}
