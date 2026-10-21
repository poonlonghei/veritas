export type Prayer = {
  id: string;
  title: string;
  category: string;
  duration: string;
  description: string;
  text: string;
  latinText?: string;
};

export type Intention = {
  id: string;
  text: string;
  createdAt: string;
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
