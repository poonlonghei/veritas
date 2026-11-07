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
