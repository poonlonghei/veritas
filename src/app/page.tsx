"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchDaily,
  fetchPrayers,
  isPrayerApiConfigured,
} from "@/lib/api";
import { prayers as starterPrayers } from "@/lib/data";
import type { DailyContent, Prayer } from "@/lib/types";

type Screen = "Home" | "Prayer library" | "The Rosary" | "About";

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

function getToday() {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function getMysteryForToday(): MysterySet {
  const day = new Date().getDay();
  if ([1, 6].includes(day)) return "Joyful";
  if (day === 2 || day === 5) return "Sorrowful";
  if (day === 4) return "Luminous";
  return "Glorious";
}

function getDailyPrayer(items: Prayer[]) {
  const index = Math.floor(Date.now() / 86_400_000) % items.length;
  return items[index];
}

export default function HomePage() {
  const [screen, setScreen] = useState<Screen>("Home");
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
        [prayer.title, prayer.category, prayer.description, prayer.latinText ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [prayerList, prayerSearch, savedIds, selectedCategory]);

  const dailyPrayer = dailyContent?.prayer ?? getDailyPrayer(prayerList);
  const currentMysteries = mysteries[mysterySet];

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

  function prayerCard(prayer: Prayer, featured = false) {
    const saved = savedIds.includes(prayer.id);
    return (
      <article className={`prayer-card${featured ? " prayer-card-featured" : ""}`} key={prayer.id}>
        <div className="prayer-card-top">
          <div className="card-tags">
            <span className="category-tag">{prayer.category}</span>
            {prayer.latinText && <span className="latin-tag text-[8px] font-semibold tracking-[.04em]">EN · LA</span>}
          </div>
          <button
            className={`icon-button bookmark-button${saved ? " is-saved" : ""}`}
            aria-label={saved ? `Remove ${prayer.title} from saved prayers` : `Save ${prayer.title}`}
            onClick={() => toggleSaved(prayer.id)}
          >
            <Icon name="bookmark" size={18} />
          </button>
        </div>
        <h3>{prayer.title}</h3>
        <p>{prayer.description}</p>
        <div className="prayer-card-footer">
          <span className="duration"><Icon name="clock" size={15} /> {prayer.duration}</span>
          <button className="text-link" onClick={() => { setPrayerLanguage("en"); setSelectedPrayer(prayer); }}>
            Pray now <Icon name="arrow" size={16} />
          </button>
        </div>
      </article>
    );
  }

  function renderMain() {
    if (screen === "Prayer library") {
      return (
        <main className="main-content">
          <header className="page-heading">
            <div><span className="eyebrow">WORDS TO RETURN TO</span><h1>The prayer library</h1>
              <p>Find a prayer for wherever you are in your journey.</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <div className="library-tools">
            <label className="search-box"><Icon name="search" size={19} />
              <input aria-label="Search prayers" placeholder="Search prayers..." value={prayerSearch}
                onChange={(event) => setPrayerSearch(event.target.value)} />
              {prayerSearch && <button className="search-clear" onClick={() => setPrayerSearch("")} aria-label="Clear search"><Icon name="close" size={16} /></button>}
            </label>
            <div className="filter-list" role="group" aria-label="Filter by category">
              {categories.map((category) => (
                <button key={category} className={`filter-chip${selectedCategory === category ? " active" : ""}`}
                  onClick={() => setSelectedCategory(category)}>{category}</button>
              ))}
            </div>
          </div>
          {visiblePrayers.length ? <div className="prayer-grid">{visiblePrayers.map((prayer) => prayerCard(prayer))}</div>
            : <div className="empty-state"><span>✳</span><h3>No prayers found</h3><p>Try another search or choose a different category.</p></div>}
        </main>
      );
    }

    if (screen === "The Rosary") {
      const completed = decade === 5;
      return (
        <main className="main-content rosary-page">
          <header className="page-heading">
            <div><span className="eyebrow">A CONTEMPLATIVE PRAYER</span><h1>Pray the Rosary</h1>
              <p>Walk gently through the life of Jesus with Mary.</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <section className="rosary-hero">
            <div className="rosary-hero-copy"><span className="eyebrow light">TODAY'S MYSTERIES</span>
              <h2>{mysterySet}<br />Mysteries</h2>
              <p>{mysterySet === "Joyful" ? "Monday & Saturday" : mysterySet === "Sorrowful" ? "Tuesday & Friday" : mysterySet === "Luminous" ? "Thursday" : "Wednesday & Sunday"}</p>
            </div>
            <div className="rosary-illustration" aria-hidden="true"><div className="rosary-ring"><span>✳</span></div><span className="rosary-cross">†</span></div>
          </section>
          <div className="mystery-select" aria-label="Choose mysteries">
            {(Object.keys(mysteries) as MysterySet[]).map((set) => (
              <button key={set} className={`filter-chip${mysterySet === set ? " active" : ""}`}
                onClick={() => { setMysterySet(set); setDecade(0); }}>{set}</button>
            ))}
          </div>
          <section className="decade-card">
            <div className="decade-heading"><div><span className="eyebrow">THE {completed ? "JOURNEY COMPLETE" : ` ${decade + 1}${["ST", "ND", "RD", "TH", "TH"][decade]} DECADE`}</span>
              <h2>{completed ? "A prayerful pause" : currentMysteries[decade]}</h2></div><span className="decade-count">{completed ? "5 / 5" : `${decade + 1} / 5`}</span></div>
            <div className="progress-track"><span style={{ width: `${(decade / 5) * 100}%` }} /></div>
            <p className="decade-instruction">{completed
              ? "You have completed the five decades. Take a moment to rest in gratitude."
              : "Hold this mystery in your heart as you pray one Our Father, ten Hail Marys, and one Glory Be."}</p>
            <div className="decade-actions">
              {decade > 0 && <button className="secondary-button" onClick={() => setDecade((step) => step - 1)}>Previous decade</button>}
              <button className="primary-button" onClick={() => setDecade(completed ? 0 : decade + 1)}>{completed ? "Pray again" : decade === 4 ? "Complete the Rosary" : "Mark decade complete"} <Icon name="arrow" size={17} /></button>
            </div>
          </section>
          <div className="rosary-note"><span className="note-icon">✦</span><p><strong>Take your time.</strong> There is no need to hurry. If your mind wanders, gently return to the mystery.</p></div>
        </main>
      );
    }

    if (screen === "About") {
      return (
        <main className="main-content about-page">
          <header className="page-heading">
            <div><span className="eyebrow">A QUIET PLACE TO PRAY</span><h1>About Veritas</h1>
              <p>A little space to pause, pray, and return to what matters.</p></div>
            <span className="heading-mark">✳</span>
          </header>
          <section className="about-intro">
            <span className="about-mark" aria-hidden="true">✳</span>
            <div><span className="eyebrow">FAITH · HOPE · LOVE</span>
              <h2>Make room for stillness.</h2>
              <p>Veritas is a quiet companion for your Catholic prayer life. Take a moment with a daily reflection, find familiar words in the prayer library, or follow a guided Rosary—at your own pace.</p>
            </div>
          </section>
          <section className="about-values" aria-label="Explore Veritas">
            <article><span className="about-value-icon"><Icon name="clock" size={21} /></span>
              <h3>A moment each day</h3><p>Daily reflections invite you to slow down and bring your whole self to prayer.</p></article>
            <article><span className="about-value-icon"><Icon name="book" size={21} /></span>
              <h3>Words to return to</h3><p>Explore traditional prayers in English and Latin, and save the ones you hold close.</p></article>
            <article><span className="about-value-icon"><Icon name="rosary" size={21} /></span>
              <h3>Pray at your own pace</h3><p>Follow the mysteries of the Rosary one gentle step at a time.</p></article>
          </section>
          <div className="about-closing"><span>✦</span><p>“Be still, and let your heart listen.”</p></div>
        </main>
      );
    }

    return (
      <main className="main-content home-content">
        <header className="welcome-row"><div><span className="eyebrow">{getToday().toUpperCase()}</span><h1>A moment for your soul.</h1>
          <p>Welcome to a quieter place. Let us begin.</p></div><div className="sun-mark" aria-hidden="true"><span>✳</span></div></header>
        <section className="daily-card">
          <div className="daily-copy"><span className="eyebrow light">A MOMENT OF PRAYER</span>
            <h2>{dailyContent?.reflection.title ?? "Make room for stillness"}</h2>
            <p>{dailyContent?.reflection.text ?? "Take one unhurried breath. Bring whatever is on your heart to God, and let this quiet moment be enough."}</p>
            <button className="cream-button" onClick={() => { setPrayerLanguage("en"); setSelectedPrayer(dailyPrayer); }}>Begin today’s prayer <Icon name="arrow" size={17} /></button>
          </div>
          <div className="daily-art" aria-hidden="true"><div className="sun-disc"><span>✳</span></div><div className="arch arch-one" /><div className="arch arch-two" /><div className="arch arch-three" /><div className="art-ground" /></div>
          <div className="daily-caption">A LITTLE STILLNESS CAN CHANGE THE SHAPE OF A DAY</div>
        </section>
        <section className="quick-grid" aria-label="Quick prayer paths">
          <button className="quick-card" onClick={() => navigate("The Rosary")}><span className="quick-icon rosary-icon"><Icon name="rosary" size={22} /></span><span className="quick-text"><strong>Pray the Rosary</strong><small>A guided moment with Mary</small></span><Icon name="arrow" size={17} /></button>
          <button className="quick-card" onClick={() => navigate("Prayer library")}><span className="quick-icon book-icon"><Icon name="book" size={22} /></span><span className="quick-text"><strong>Find a prayer</strong><small>Words for every season</small></span><Icon name="arrow" size={17} /></button>
        </section>
        <section className="popular-section">
          <div className="section-heading"><div><span className="eyebrow">A FEW WORDS TO KEEP CLOSE</span><h2>Prayers for the everyday</h2></div><button className="text-link" onClick={() => navigate("Prayer library")}>View all <Icon name="arrow" size={16} /></button></div>
          <div className="prayer-grid home-prayer-grid">{prayerList.slice(0, 3).map((prayer) => prayerCard(prayer))}</div>
        </section>
        <section className="closing-note"><span>✳</span><p>“Let us remember that we are in the holy presence of God.”</p><small>A quiet invitation to begin</small></section>
      </main>
    );
  }

  const navItems: { name: Screen; icon: string }[] = [
    { name: "Home", icon: "home" },
    { name: "Prayer library", icon: "book" },
    { name: "The Rosary", icon: "rosary" },
  ];

  return (
    <div className="app-shell min-h-screen antialiased">
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <button className="brand" onClick={() => navigate("Home")} aria-label="Veritas home">
          <span className="brand-mark">✳</span><span className="brand-name">veritas<small>A QUIET PLACE TO PRAY</small></span>
        </button>
        <span className="nav-label">YOUR PRAYER SPACE</span>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.name} onClick={() => navigate(item.name)} className={`nav-item${screen === item.name ? " nav-active" : ""}`}>
            <Icon name={item.icon} size={19} /><span>{item.name}</span>
          </button>)}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => navigate("About")} className={`nav-item about-nav-item${screen === "About" ? " nav-active" : ""}`}>
            <Icon name="info" size={19} /><span>About</span>
          </button>
          <div className="sidebar-quote"><span>✧</span><p>“Be still, and let your heart listen.”</p><small>A moment of quiet</small></div>
          <div className="sidebar-footer"><span className="footer-cross">✝</span><span>FAITH · HOPE · LOVE</span></div></div>
      </aside>
      {sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <div className="content-column">
        <div className="mobile-header"><button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Icon name="menu" /></button>
          <button className="mobile-brand" onClick={() => navigate("Home")}><span>✳</span> veritas</button><span className="mobile-header-spacer" /></div>
        {renderMain()}
        <footer className="page-footer"><span>✳</span><span>Made for a little more stillness.</span><span>VERITAS</span></footer>
      </div>
      {selectedPrayer && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPrayer(null); }}>
        <section className="prayer-modal" role="dialog" aria-modal="true" aria-labelledby="prayer-modal-title">
          <button className="icon-button modal-close" aria-label="Close prayer" onClick={() => setSelectedPrayer(null)}><Icon name="close" /></button>
          <span className="eyebrow">{selectedPrayer.category} · {selectedPrayer.duration}</span>
          <span className="modal-mark">✳</span><h2 id="prayer-modal-title">{selectedPrayer.title}</h2>
          {selectedPrayer.latinText && <div className="prayer-language-switch" role="group" aria-label="Prayer language">
            <button className={`language-button${prayerLanguage === "en" ? " active" : ""} focus-visible:ring-2 focus-visible:ring-[#657e69]`} aria-pressed={prayerLanguage === "en"} onClick={() => setPrayerLanguage("en")}>English</button>
            <button className={`language-button${prayerLanguage === "la" ? " active" : ""} focus-visible:ring-2 focus-visible:ring-[#657e69]`} aria-pressed={prayerLanguage === "la"} onClick={() => setPrayerLanguage("la")}>Latin</button>
          </div>}
          <div className="modal-divider"><span>✦</span></div><p className={`prayer-text${prayerLanguage === "la" ? " prayer-text-latin" : ""}`}>{prayerLanguage === "la" && selectedPrayer.latinText ? selectedPrayer.latinText : selectedPrayer.text}</p>
          <button className="primary-button modal-done" onClick={() => setSelectedPrayer(null)}>Amen <Icon name="arrow" size={17} /></button>
        </section>
      </div>}
      {toast && <div className="toast-message" role="status">{toast}</div>}
    </div>
  );
}
