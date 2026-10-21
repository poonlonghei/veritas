import type { DailyContent, Intention, Prayer } from "./types";
import { prayers as bundledPrayers } from "./data";

const configuredIntentionsApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const INTENTIONS_API_URL =
  configuredIntentionsApiUrl === undefined
    ? process.env.NODE_ENV === "development"
      ? "http://localhost:8000/api"
      : ""
    : configuredIntentionsApiUrl.replace(/\/$/, "");
const configuredPrayerApiUrl = process.env.NEXT_PUBLIC_PRAYER_API_URL?.trim();
const PRAYER_API_URL =
  configuredPrayerApiUrl === undefined
    ? process.env.NODE_ENV === "development"
      ? "http://localhost:8080/api"
      : ""
    : configuredPrayerApiUrl.replace(/\/$/, "");

export function isApiConfigured(): boolean {
  return Boolean(INTENTIONS_API_URL);
}

export function isPrayerApiConfigured(): boolean {
  return Boolean(PRAYER_API_URL);
}

async function request<T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  if (!baseUrl) {
    throw new Error(
      "This service is not configured. Set its API URL in the deployment environment.",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach the API at ${baseUrl}. Check that the service is running and allows this site's origin.`,
      );
    }
    throw error;
  }

  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return body;
}

export async function fetchPrayers(): Promise<Prayer[]> {
  if (!PRAYER_API_URL) {
    return bundledPrayers;
  }

  const result = await request<{ prayers: Prayer[] }>(PRAYER_API_URL, "/prayers/");
  return result.prayers;
}

export async function fetchDaily(): Promise<DailyContent> {
  return request<DailyContent>(PRAYER_API_URL, "/daily/");
}

export async function fetchIntentions(): Promise<Intention[]> {
  const result = await request<{ intentions: Intention[] }>(
    INTENTIONS_API_URL,
    "/intentions/",
  );
  return result.intentions;
}

export async function createIntention(text: string): Promise<Intention> {
  const result = await request<{ intention: Intention }>(
    INTENTIONS_API_URL,
    "/intentions/",
    {
    method: "POST",
    body: JSON.stringify({ text }),
    },
  );
  return result.intention;
}

export async function deleteIntention(id: string): Promise<void> {
  await request<{ deleted: boolean }>(
    INTENTIONS_API_URL,
    `/intentions/${encodeURIComponent(id)}/`,
    { method: "DELETE" },
  );
}
