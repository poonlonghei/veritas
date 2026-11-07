export type LocaleContent = {
  locale: "en" | "zh-TW";
  translations: Record<string, string>;
  dailyReflection?: {
    title: string;
    text: string;
    reference: string;
  };
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export async function loadLocaleContent(
  locale: LocaleContent["locale"],
): Promise<LocaleContent> {
  const response = await fetch(`${basePath}/content/${locale === "zh-TW" ? "zh-tw" : "en"}.json`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Locale content request failed (${response.status})`);
  }
  return response.json() as Promise<LocaleContent>;
}

function sectionValue(section: string, heading: string): string {
  const match = new RegExp(`### ${heading}\\s+([\\s\\S]*?)(?=\\n### |$)`).exec(section);
  return match?.[1].trim() ?? "";
}

export function parsePrayerMarkdown(markdown: string): Prayer[] {
  return markdown
    .split(/\n(?=## )/)
    .slice(1)
    .map((section) => {
      const title = /^## (.+)$/m.exec(section)?.[1].trim() ?? "";
      const id = /<!-- id: ([^>]+) -->/.exec(section)?.[1].trim() ?? "";
      const category = /^\*\*Category:\*\* (.+)$/m.exec(section)?.[1].trim() ?? "";
      const duration = /^\*\*Duration:\*\* (.+)$/m.exec(section)?.[1].trim() ?? "";
      const latinText = sectionValue(section, "Latin");
      return {
        id,
        title,
        category,
        duration,
        description: sectionValue(section, "Description"),
        text: sectionValue(section, "Prayer"),
        ...(latinText ? { latinText } : {}),
      };
    })
    .filter((prayer) => prayer.id && prayer.title && prayer.text);
}

export async function loadPrayerCatalog(
  locale: LocaleContent["locale"],
): Promise<Prayer[]> {
  const fileName = locale === "zh-TW" ? "prayers-zh-tw.md" : "prayers-en.md";
  const response = await fetch(`${basePath}/content/${fileName}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Prayer catalog request failed (${response.status})`);
  }
  return parsePrayerMarkdown(await response.text());
}
import type { Prayer } from "./types";
