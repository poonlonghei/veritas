export type Prayer = {
  id: string;
  title: string;
  category: string;
  duration: string;
  description: string;
  text: string;
  latinText?: string;
};

export type DailyContent = {
  date: string;
  reflection: {
    title: string;
    text: string;
    reference: string;
  };
  prayer: Prayer;
};

export type PrayerIntention = {
  id: string;
  text: string;
  name: string;
  location: string;
  language: "en" | "zh-TW";
  createdAt: string;
};

export type MonthlyIntentions = {
  month: string;
  language: "en" | "zh-TW";
  months: string[];
  intentions: PrayerIntention[];
};
