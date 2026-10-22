"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchDaily,
  fetchPrayers,
  isPrayerApiConfigured,
} from "@/lib/api";
import { prayers as starterPrayers } from "@/lib/data";
import {
  traditionalChinese,
  traditionalChineseDailyReflection,
} from "@/lib/translations";
import type { DailyContent, Prayer } from "@/lib/types";

type Screen = "Home" | "Daily readings" | "Prayer library" | "The Rosary" | "About";
type Locale = "en" | "zh-TW";

const categories = ["All", "Saved", "Daily", "Traditional", "Marian", "Hope & Peace", "Sacraments"];
const mysteries = {
  Joyful: [
    "The Annunciation",
    "The Visitation",
    "The Nativity",
    "The Presentation",
    "The Finding of Jesus in the Temple",
  ],
  Sorrowful: [
    "The Agony in the Garden",
    "The Scourging at the Pillar",
    "The Crowning with Thorns",
    "The Carrying of the Cross",
    "The Crucifixion",
  ],
  Glorious: [
    "The Resurrection",
    "The Ascension",
    "The Descent of the Holy Spirit",
    "The Assumption of Mary",
    "The Coronation of Mary",
  ],
  Luminous: [
    "The Baptism of Jesus",
    "The Wedding at Cana",
    "The Proclamation of the Kingdom",
    "The Transfiguration",
    "The Institution of the Eucharist",
  ],
};
type MysterySet = keyof typeof mysteries;

const dailySaints = [
  {
    name: "Saint Francis of Assisi",
    biography:
      "After giving up a life of wealth, Francis embraced poverty and founded the Order of Friars Minor. His love for creation and care for the poor continue to inspire a life of simplicity and peace.",
    virtue: "Simplicity & peace",
  },
  {
    name: "Saint Thérèse of Lisieux",
    biography:
      "A Carmelite nun, Thérèse taught that holiness can be found in ordinary acts of love. Her “Little Way” encouraged trust in God and faithfulness in small things.",
    virtue: "Trust & little acts of love",
  },
  {
    name: "Saint Augustine of Hippo",
    biography:
      "After a long search for truth, Augustine became a Christian, a priest, and the bishop of Hippo. His writings, including Confessions, reflect on grace, conversion, and the restless heart seeking God.",
    virtue: "Conversion & wisdom",
  },
  {
    name: "Saint Joseph",
    biography:
      "The foster father of Jesus and husband of Mary, Joseph cared for the Holy Family with courage and quiet faithfulness. The Gospels remember his steady obedience to God’s guidance.",
    virtue: "Faithfulness & courage",
  },
  {
    name: "Saint Catherine of Siena",
    biography:
      "A Dominican tertiary and mystic, Catherine devoted herself to prayer, service to the sick, and peacemaking. Her counsel and letters made her an influential voice in the Church.",
    virtue: "Courage & peacemaking",
  },
  {
    name: "Saint Benedict of Nursia",
    biography:
      "Benedict shaped Western monastic life through a Rule that balances prayer, work, hospitality, and community. His teaching continues to guide Benedictine monasteries around the world.",
    virtue: "Prayer & hospitality",
  },
  {
    name: "Saint Elizabeth Ann Seton",
    biography:
      "A convert to Catholicism and a mother, Elizabeth founded the Sisters of Charity of St. Joseph and helped establish Catholic education in the United States.",
    virtue: "Education & charity",
  },
  {
    name: "Saint Martin de Porres",
    biography:
      "A Dominican lay brother in Lima, Martin served the sick and poor with humility and compassion. He is remembered for his care for people across social divisions.",
    virtue: "Humility & compassion",
  },
  {
    name: "Saint Teresa of Calcutta",
    biography:
      "Teresa founded the Missionaries of Charity to serve people living in poverty. Her community cared especially for those who were sick, abandoned, and dying.",
    virtue: "Service & mercy",
  },
  {
    name: "Saint John Paul II",
    biography:
      "A Polish priest who became pope, John Paul II travelled widely, taught about human dignity, and encouraged young people to live their faith with hope and courage.",
    virtue: "Hope & human dignity",
  },
  {
    name: "Saint Clare of Assisi",
    biography:
      "Inspired by Francis of Assisi, Clare founded the Order of Poor Ladies, now known as the Poor Clares. She chose a life of prayer, poverty, and service in community.",
    virtue: "Prayer & simplicity",
  },
  {
    name: "Saint Óscar Romero",
    biography:
      "As Archbishop of San Salvador, Romero spoke out against violence and injustice and stood with people suffering oppression. He was killed while celebrating Mass in 1980.",
    virtue: "Justice & solidarity",
  },
];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h14V9M9 21v-7h6v7" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8" /></>,
    rosary: <><circle cx="12" cy="10" r="7" /><path d="M12 17v4m-2-2h4M9 7h.01M15 7h.01M8 11h.01M16 11h.01M12 5h.01" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    bookmark: <><path d="M6 4h12v17l-6-4-6 4z" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  };
  return <svg {...common}>{paths[name] ?? paths.home}</svg>;
}

function getToday(locale: Locale) {
  return new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function getSaintForToday() {
  const today = new Date();
  const yearStart = Date.UTC(today.getFullYear(), 0, 1);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOfYear = Math.floor((todayUtc - yearStart) / 86_400_000);
  return dailySaints[dayOfYear % dailySaints.length];
}

function getMysteryForToday(): MysterySet {
  const day = new Date().getDay();
  if ([1, 6].includes(day)) return "Joyful";
  if (day === 2 || day === 5) return "Sorrowful";
  if (day === 4) return "Luminous";
  return "Glorious";
}

function getRandomPrayer(items: Prayer[]) {
  if (items.length === 0) return null;
  const index = Math.floor(Math.random() * items.length);
  return items[index];
}

function translate(locale: Locale, value: string) {
  return locale === "zh-TW" ? traditionalChinese[value] ?? value : value;
}

function localizePrayer(prayer: Prayer, locale: Locale): Prayer {
  return {
    ...prayer,
    title: translate(locale, prayer.title),
    category: translate(locale, prayer.category),
    duration:
      locale === "zh-TW"
        ? prayer.duration.replace(/\s*min$/, " 分鐘")
        : prayer.duration,
    description: translate(locale, prayer.description),
    text: translate(locale, prayer.text),
  };
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("Home");
  const [locale, setLocale] = useState<Locale>("en");
  const [prayerList, setPrayerList] = useState<Prayer[]>(starterPrayers);
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  const [prayerSearch, setPrayerSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPrayer, setSelectedPrayer] = useState<Prayer | null>(null);
  const [prayerLanguage, setPrayerLanguage] = useState<"en" | "la">("en");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [mysterySet, setMysterySet] = useState<MysterySet>(getMysteryForToday);
  const [decade, setDecade] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const savedLocale = window.localStorage.getItem("veritas-locale");
      if (savedLocale === "en" || savedLocale === "zh-TW") {
        setLocale(savedLocale);
      }
    } catch {
      // Keep English as the default when browser storage is unavailable.
    }
    try {
      const stored = window.localStorage.getItem("veritas-saved-prayers");
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
          setSavedIds(parsed);
        }
      }
    } catch {
      setSavedIds([]);
    }
    fetchPrayers()
      .then(setPrayerList)
      .catch(() =>
        setToast(
          "Showing the built-in prayer library. The prayer service is unavailable.",
        ),
      );
    if (isPrayerApiConfigured()) {
      fetchDaily()
        .then(setDailyContent)
        .catch(() => setToast("Today's reflection is unavailable. Please try again later."));
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh-TW" ? "zh-Hant" : "en";
    try {
      window.localStorage.setItem("veritas-locale", locale);
    } catch {
      // The language switch remains usable when browser storage is unavailable.
    }
  }, [locale]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const t = (value: string) => translate(locale, value);

  const visiblePrayers = useMemo(() => {
    const query = prayerSearch.trim().toLowerCase();
    return prayerList.filter((prayer) => {
      const matchesCategory =
        selectedCategory === "All" ||
        (selectedCategory === "Saved"
          ? savedIds.includes(prayer.id)
          : prayer.category === selectedCategory);
      const matchesSearch =
        !query ||
        [
          translate(locale, prayer.title),
          translate(locale, prayer.category),
          translate(locale, prayer.description),
          translate(locale, prayer.text),
          prayer.latinText ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [locale, prayerList, prayerSearch, savedIds, selectedCategory]);

  const dailySaint = getSaintForToday();
  const currentMysteries = mysteries[mysterySet];
  const dailyReflection =
    locale === "zh-TW"
      ? traditionalChineseDailyReflection
      : dailyContent?.reflection ?? {
          title: "A reflection for today",
          text: "Take one unhurried breath. Bring whatever is on your heart to God, and let this quiet moment be enough.",
          reference: "",
        };
  const displayedSelectedPrayer = selectedPrayer ? localizePrayer(selectedPrayer, locale) : null;

  function navigate(next: Screen) {
    setScreen(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => {
      const next = current.includes(id)
        ? current.filter((savedId) => savedId !== id)
        : [...current, id];
      window.localStorage.setItem("veritas-saved-prayers", JSON.stringify(next));
      return next;
    });
  }

  function beginRandomPrayer() {
    const prayer = getRandomPrayer(prayerList);
    if (!prayer) {
      setToast(locale === "zh-TW" ? "目前沒有可用的祈禱文。" : "No prayers are available right now.");
      return;
    }
    setPrayerLanguage("en");
    setSelectedPrayer(prayer);
  }

  function prayerCard(prayer: Prayer, featured = false) {
    const saved = savedIds.includes(prayer.id);
    const displayedPrayer = localizePrayer(prayer, locale);
    return (
      <article className={`prayer-card${featured ? " prayer-card-featured" : ""}`} key={prayer.id}>
        <div className="prayer-card-top">
          <div className="card-tags">
            <span className="category-tag">{displayedPrayer.category}</span>
            {prayer.latinText && <span className="latin-tag text-[8px] font-semibold tracking-[.04em]">{locale === "zh-TW" ? "中 · 拉" : "EN · LA"}</span>}
          </div>
          <button
            className={`icon-button bookmark-button${saved ? " is-saved" : ""}`}
            aria-label={saved ? `${t("Remove prayer from saved prayers")}: ${displayedPrayer.title}` : `${t("Save prayer")}: ${displayedPrayer.title}`}
            onClick={() => toggleSaved(prayer.id)}
          >
            <Icon name="bookmark" size={18} />
          </button>
        </div>
        <h3>{displayedPrayer.title}</h3>
        <p>{displayedPrayer.description}</p>
        <div className="prayer-card-footer">
          <span className="duration"><Icon name="clock" size={15} /> {displayedPrayer.duration}</span>
          <button className="text-link" onClick={() => { setPrayerLanguage("en"); setSelectedPrayer(prayer); }}>
            {t("Pray now")} <Icon name="arrow" size={16} />
          </button>
        </div>
      </article>
    );
  }

  function renderMain() {
    if (screen === "Daily readings") {
      return (
        <main className="main-content readings-page">
          <header className="page-heading">
            <div><span className="eyebrow">{getToday(locale).toUpperCase()}</span><h1>{t("Daily readings & reflection")}</h1>
              <p>{t("Spend a moment with the readings and Gospel for today.")}</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <section className="readings-section" aria-labelledby="mass-readings-heading">
            <div className="readings-section-heading">
              <span className="eyebrow">{t("THE LITURGY OF THE DAY")}</span>
              <h2 id="mass-readings-heading">{t("Today’s Mass readings")}</h2>
              <p>{t("Read the first reading, responsorial psalm, and Gospel here.")}</p>
            </div>
            <iframe
              className="reading-embed"
              src={locale === "zh-TW" ? "http://catholic-dlc.org.hk/frame3.htm" : "https://universalis.com/mass.htm"}
              title={t("Today’s Mass readings from Universalis")}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
            <span className="universalis-credit">{t("Mass readings from Universalis.")}</span>
            {locale === "zh-TW" && (
              <a className="reading-resource-link" href="http://catholic-dlc.org.hk/frame3.htm">
                {t("Open the daily readings from the Hong Kong Diocese")}
              </a>
            )}
          </section>
          <section className="gospel-reflection" aria-labelledby="gospel-reflection-heading">
            <span className="eyebrow">{t("PAUSE WITH THE WORD")}</span>
            <h2 id="gospel-reflection-heading">{dailyReflection.title}</h2>
            <p>{dailyReflection.text}</p>
            {dailyReflection.reference && <span className="reflection-reference">{dailyReflection.reference}</span>}
          </section>
        </main>
      );
    }

    if (screen === "Prayer library") {
      return (
        <main className="main-content">
          <header className="page-heading">
            <div><span className="eyebrow">{t("WORDS TO RETURN TO")}</span><h1>{t("The prayer library")}</h1>
              <p>{t("Find a prayer for wherever you are in your journey.")}</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <div className="library-tools">
            <label className="search-box"><Icon name="search" size={19} />
              <input aria-label={t("Search prayers")} placeholder={t("Search prayers...")} value={prayerSearch}
                onChange={(event) => setPrayerSearch(event.target.value)} />
              {prayerSearch && <button className="search-clear" onClick={() => setPrayerSearch("")} aria-label={t("Clear search")}><Icon name="close" size={16} /></button>}
            </label>
            <div className="filter-list" role="group" aria-label={t("Filter by category")}>
              {categories.map((category) => (
                <button key={category} className={`filter-chip${selectedCategory === category ? " active" : ""}`}
                  onClick={() => setSelectedCategory(category)}>{t(category)}</button>
              ))}
            </div>
          </div>
          {visiblePrayers.length ? <div className="prayer-grid">{visiblePrayers.map((prayer) => prayerCard(prayer))}</div>
            : <div className="empty-state"><span>✳</span><h3>{t("No prayers found")}</h3><p>{t("Try another search or choose a different category.")}</p></div>}
        </main>
      );
    }

    if (screen === "The Rosary") {
      const completed = decade === 5;
      return (
        <main className="main-content rosary-page">
          <header className="page-heading">
            <div><span className="eyebrow">{t("A CONTEMPLATIVE PRAYER")}</span><h1>{t("Pray the Rosary")}</h1>
              <p>{t("Walk gently through the life of Jesus with Mary.")}</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <section className="rosary-hero">
            <div className="rosary-hero-copy"><span className="eyebrow light">{t("TODAY'S MYSTERIES")}</span>
              <h2>{t(mysterySet)}<br />{t("Mysteries")}</h2>
              <p>{t(mysterySet === "Joyful" ? "Monday & Saturday" : mysterySet === "Sorrowful" ? "Tuesday & Friday" : mysterySet === "Luminous" ? "Thursday" : "Wednesday & Sunday")}</p>
            </div>
            <div className="rosary-illustration" aria-hidden="true"><div className="rosary-ring"><span>✳</span></div><span className="rosary-cross">†</span></div>
          </section>
          <div className="mystery-select" aria-label={t("Choose mysteries")}>
            {(Object.keys(mysteries) as MysterySet[]).map((set) => (
              <button key={set} className={`filter-chip${mysterySet === set ? " active" : ""}`}
                onClick={() => { setMysterySet(set); setDecade(0); }}>{t(set)}</button>
            ))}
          </div>
          <section className="decade-card">
            <div className="decade-heading"><div><span className="eyebrow">{completed ? t("JOURNEY COMPLETE") : `第 ${decade + 1} ${t("DECADE")}`}</span>
              <h2>{completed ? t("A prayerful pause") : t(currentMysteries[decade])}</h2></div><span className="decade-count">{completed ? "5 / 5" : `${decade + 1} / 5`}</span></div>
            <div className="progress-track"><span style={{ width: `${(decade / 5) * 100}%` }} /></div>
            <p className="decade-instruction">{completed
              ? t("You have completed the five decades. Take a moment to rest in gratitude.")
              : t("Hold this mystery in your heart as you pray one Our Father, ten Hail Marys, and one Glory Be.")}</p>
            <div className="decade-actions">
              {decade > 0 && <button className="secondary-button" onClick={() => setDecade((step) => step - 1)}>{t("Previous decade")}</button>}
              <button className="primary-button" onClick={() => setDecade(completed ? 0 : decade + 1)}>{t(completed ? "Pray again" : decade === 4 ? "Complete the Rosary" : "Mark decade complete")} <Icon name="arrow" size={17} /></button>
            </div>
          </section>
          <div className="rosary-note"><span className="note-icon">✦</span><p><strong>{t("Take your time.")}</strong> {t("There is no need to hurry. If your mind wanders, gently return to the mystery.")}</p></div>
        </main>
      );
    }

    if (screen === "About") {
      return (
        <main className="main-content about-page">
          <header className="page-heading">
            <div><span className="eyebrow">{t("A QUIET PLACE TO PRAY")}</span><h1>{t("About Veritas")}</h1>
              <p>{t("A little space to pause, pray, and return to what matters.")}</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <section className="about-intro">
            <span className="about-mark" aria-hidden="true">✳</span>
            <div><span className="eyebrow">{t("FAITH · HOPE · LOVE")}</span>
              <h2>{t("Make room for stillness.")}</h2>
              <p>{t("Veritas is a quiet companion for your Catholic prayer life. Take a moment with a daily reflection, find familiar words in the prayer library, or follow a guided Rosary—at your own pace.")}</p>
            </div>
          </section>
          <section className="about-values" aria-label={t("Explore Veritas")}>
            <article><span className="about-value-icon"><Icon name="clock" size={21} /></span>
              <h3>{t("A moment each day")}</h3><p>{t("Daily reflections invite you to slow down and bring your whole self to prayer.")}</p></article>
            <article><span className="about-value-icon"><Icon name="book" size={21} /></span>
              <h3>{t("Words to return to")}</h3><p>{t("Explore traditional prayers in English and Latin, and save the ones you hold close.")}</p></article>
            <article><span className="about-value-icon"><Icon name="rosary" size={21} /></span>
              <h3>{t("Pray at your own pace")}</h3><p>{t("Follow the mysteries of the Rosary one gentle step at a time.")}</p></article>
          </section>
          <section className="about-me" aria-labelledby="about-me-heading">
            <span className="eyebrow">{t("THE PERSON BEHIND VERITAS")}</span>
            <h2 id="about-me-heading">{t("About me")}</h2>
            <p>{t("My name is Chavez Cyrillus Mariae Long Hei Poon. I am a Traditionalist Roman Catholic lay Acolyte, Liturgical Master of Ceremonies, freelance writer, and Catholic digital content creator based in England. Born and educated in Hong Kong, I have served the Church for more than a decade as an Acolyte, Sacristan, and Liturgical Master of Ceremonies. This service has deepened my appreciation for the Sacred Liturgy, ecclesiastical history, and the spiritual heritage of the Roman Catholic Church.")}</p>
            <p>{t("I combine my background in information technology with my commitment to the Church through website development, Catholic communications, and digital projects. Veritas is my latest initiative: a prayer app intended to make traditional and contemporary devotional resources more accessible and to encourage daily prayer, reflection, and a deeper relationship with God.")}</p>
            <p>{t("I am also the founder of Lumen Orientale, where I write about Catholic liturgy, ecclesiastical history, and developments in the Church. Through writing and digital publishing, I hope to make the Church’s traditions better understood while remaining faithful to her teachings and communion with the Holy See.")}</p>
            <p>{t("My mission is to bring the timeless treasures of Catholic spirituality to everyday life, using faith, liturgical knowledge, writing, and technology in the service of the Church and a new generation.")}</p>
            <p className="about-motto"><em>Ad maiorem Dei gloriam</em> {t("— For the greater glory of God.")}</p>
          </section>
          <div className="about-closing"><span>✦</span><p>{t("“Be still, and let your heart listen.”")}</p></div>
        </main>
      );
    }

    return (
      <main className="main-content home-content">
        <header className="welcome-row"><div><span className="eyebrow">{getToday(locale).toUpperCase()}</span><h1>{t("A moment for your soul.")}</h1>
          <p>{t("Welcome to a quieter place. Let us begin.")}</p></div><div className="sun-mark" aria-hidden="true"><span>✳</span></div></header>
        <section className="daily-card">
          <div className="daily-copy"><span className="eyebrow light">{t("A MOMENT OF PRAYER")}</span>
            <h2>{locale === "zh-TW" ? dailyReflection.title : t(dailyContent?.reflection.title ?? "Make room for stillness")}</h2>
            <p>{locale === "zh-TW" ? dailyReflection.text : t(dailyContent?.reflection.text ?? "Take one unhurried breath. Bring whatever is on your heart to God, and let this quiet moment be enough.")}</p>
            <button className="cream-button" onClick={beginRandomPrayer}>{t("Begin today’s prayer")} <Icon name="arrow" size={17} /></button>
          </div>
          <div className="daily-art" aria-hidden="true"><div className="sun-disc"><span>✳</span></div><div className="arch arch-one" /><div className="arch arch-two" /><div className="arch arch-three" /><div className="art-ground" /></div>
          <div className="daily-caption">{t("A LITTLE STILLNESS CAN CHANGE THE SHAPE OF A DAY")}</div>
        </section>
        <section className="scripture-card" aria-labelledby="scripture-heading">
          <div className="scripture-card-heading">
            <div><span className="eyebrow">{t("TODAY’S SCRIPTURE")}</span><h2 id="scripture-heading">{t("Read, reflect, and pray.")}</h2></div>
            {dailyContent?.reflection.reference && <span className="scripture-reference">{dailyContent.reflection.reference}</span>}
          </div>
          <p>{t("Take a quiet moment with today’s Gospel. Notice a word or phrase that stays with you, and consider how you might carry it into your day.")}</p>
          <div className="scripture-links">
            <button onClick={() => navigate("Daily readings")}>{t("View today’s readings & reflection")} <Icon name="arrow" size={15} /></button>
          </div>
          <span className="scripture-source">{t("Mass readings: Universalis.")}</span>
        </section>
        <section className="saint-card" aria-labelledby="saint-heading">
          <div className="saint-card-copy">
            <span className="eyebrow">{t("A SAINT TO ACCOMPANY YOU TODAY")}</span>
            <h2 id="saint-heading">{t(dailySaint.name)}</h2>
            <p>{t(dailySaint.biography)}</p>
            <span className="saint-virtue">{t(dailySaint.virtue)}</span>
          </div>
          <div className="saint-card-mark" aria-hidden="true">✝</div>
        </section>
        <section className="quick-grid" aria-label={t("Quick prayer paths")}>
          <button className="quick-card" onClick={() => navigate("The Rosary")}><span className="quick-icon rosary-icon"><Icon name="rosary" size={22} /></span><span className="quick-text"><strong>{t("Pray the Rosary")}</strong><small>{t("A guided moment with Mary")}</small></span><Icon name="arrow" size={17} /></button>
          <button className="quick-card" onClick={() => navigate("Prayer library")}><span className="quick-icon book-icon"><Icon name="book" size={22} /></span><span className="quick-text"><strong>{t("Find a prayer")}</strong><small>{t("Words for every season")}</small></span><Icon name="arrow" size={17} /></button>
        </section>
        <section className="popular-section">
          <div className="section-heading"><div><span className="eyebrow">{t("A FEW WORDS TO KEEP CLOSE")}</span><h2>{t("Prayers for the everyday")}</h2></div><button className="text-link" onClick={() => navigate("Prayer library")}>{t("View all")} <Icon name="arrow" size={16} /></button></div>
          <div className="prayer-grid home-prayer-grid">{prayerList.slice(0, 3).map((prayer) => prayerCard(prayer))}</div>
        </section>
        <section className="closing-note"><span>✳</span><p>{t("“Let us remember that we are in the holy presence of God.”")}</p><small>{t("A quiet invitation to begin")}</small></section>
      </main>
    );
  }

  const navItems: { name: Screen; icon: string }[] = [
    { name: "Home", icon: "home" },
    { name: "Daily readings", icon: "book" },
    { name: "Prayer library", icon: "book" },
    { name: "The Rosary", icon: "rosary" },
  ];

  return (
    <div className="app-shell min-h-screen antialiased">
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <button className="brand" onClick={() => navigate("Home")} aria-label={t("Veritas home")}>
          <span className="brand-mark">✳</span><span className="brand-name">veritas<small>{t("A QUIET PLACE TO PRAY")}</small></span>
        </button>
        <span className="nav-label">{t("YOUR PRAYER SPACE")}</span>
        <nav className="side-nav" aria-label={t("Main navigation")}>
          {navItems.map((item) => <button key={item.name} onClick={() => navigate(item.name)} className={`nav-item${screen === item.name ? " nav-active" : ""}`}>
            <Icon name={item.icon} size={19} /><span>{t(item.name)}</span>
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => navigate("About")} className={`nav-item about-nav-item${screen === "About" ? " nav-active" : ""}`}>
            <Icon name="info" size={19} /><span>{t("About")}</span>
          </button>
          <div className="locale-switch" role="group" aria-label={t("Language")}>
            <button className={locale === "en" ? "locale-active" : ""} aria-pressed={locale === "en"} onClick={() => setLocale("en")}>English</button>
            <button className={locale === "zh-TW" ? "locale-active" : ""} aria-pressed={locale === "zh-TW"} onClick={() => setLocale("zh-TW")}>繁體中文</button>
          </div>
          <div className="sidebar-quote"><span>✧</span><p>{t("“Be still, and let your heart listen.”")}</p><small>{t("A moment of quiet")}</small></div>
          <div className="sidebar-footer"><span className="footer-cross">✝</span><span>{t("FAITH · HOPE · LOVE")}</span></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label={t("Close navigation")} onClick={() => setSidebarOpen(false)} />}
      <div className="content-column">
        <div className="mobile-header"><button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label={t("Open navigation")}><Icon name="menu" /></button>
          <button className="mobile-brand" onClick={() => navigate("Home")}><span>✳</span> veritas</button><span className="mobile-header-spacer" /></div>
        {renderMain()}
        <footer className="page-footer"><span>✳</span><span>{t("Made for a little more stillness.")}</span><span>VERITAS</span></footer>
      </div>
      {selectedPrayer && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPrayer(null); }}>
        <section className="prayer-modal" role="dialog" aria-modal="true" aria-labelledby="prayer-modal-title">
          <button className="icon-button modal-close" aria-label={t("Close prayer")} onClick={() => setSelectedPrayer(null)}><Icon name="close" /></button>
          <span className="eyebrow">{displayedSelectedPrayer?.category} · {displayedSelectedPrayer?.duration}</span>
          <span className="modal-mark">✳</span><h2 id="prayer-modal-title">{displayedSelectedPrayer?.title}</h2>
          {selectedPrayer.latinText && <div className="prayer-language-switch" role="group" aria-label={t("Prayer language")}>
            <button className={`language-button${prayerLanguage === "en" ? " active" : ""} focus-visible:ring-2 focus-visible:ring-[#657e69]`} aria-pressed={prayerLanguage === "en"} onClick={() => setPrayerLanguage("en")}>{t(locale === "zh-TW" ? "繁體中文" : "English")}</button>
            <button className={`language-button${prayerLanguage === "la" ? " active" : ""} focus-visible:ring-2 focus-visible:ring-[#657e69]`} aria-pressed={prayerLanguage === "la"} onClick={() => setPrayerLanguage("la")}>{t("Latin")}</button>
          </div>}
          <div className="modal-divider"><span>✦</span></div><p className={`prayer-text${prayerLanguage === "la" ? " prayer-text-latin" : ""}`}>{prayerLanguage === "la" && selectedPrayer.latinText ? selectedPrayer.latinText : displayedSelectedPrayer?.text}</p>
          <button className="primary-button modal-done" onClick={() => setSelectedPrayer(null)}>{t("Amen")} <Icon name="arrow" size={17} /></button>
        </section>
      </div>}
      {toast && <div className="toast-message" role="status">{t(toast)}</div>}
    </div>
  );
}
