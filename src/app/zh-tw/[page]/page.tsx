import HomePage, { type Screen } from "../../page";

const screens: Record<string, Screen> = {
  readings: "Daily readings",
  "prayer-intentions": "Prayer intentions",
  "holy-mass": "Order of Holy Mass",
  "prayer-library": "Prayer library",
  rosary: "The Rosary",
  about: "About",
};

export function generateStaticParams() {
  return [
    { page: "readings" },
    { page: "prayer-intentions" },
    { page: "holy-mass" },
    { page: "prayer-library" },
    { page: "rosary" },
    { page: "about" },
  ];
}

export default async function ChineseRoutedPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  return <HomePage initialScreen={screens[page] ?? "Home"} initialLocale="zh-TW" />;
}
