"use client";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { useLocale } from "@/lib/i18n";

export default function PlayerGuide({
  userId,
  request,
  onNavigate,
}: {
  userId: string;
  request: number;
  onNavigate: (page: string) => void;
}) {
  const { language } = useLocale();
  const nl = language === "nl";
  const text = (en: string, dutch: string) => (nl ? dutch : en);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const key = `apex-player-guide:v1:${userId}`;
  const steps = [
    {
      icon: Flag,
      title: text("Welcome to your grid", "Welkom op de grid"),
      label: text("Start here", "Begin hier"),
      body: text(
        "Pick your finishers, submit before the deadline and compete with your league all season. This quick guide shows you where everything lives.",
        "Kies je finishers, dien in voor de deadline en strijd het hele seizoen tegen je league. Deze korte uitleg laat zien waar je alles vindt.",
      ),
      tip: text(
        "Find this guide any time using Player guide in the menu or the book button at the top.",
        "Open deze uitleg altijd via Spelersgids in het menu of het boekknopje bovenaan.",
      ),
      page: "home",
      action: text("Open overview", "Open overzicht"),
    },
    {
      icon: CheckCircle2,
      title: text("Make it official: submit", "Maak het officieel: indienen"),
      label: text("Predictions", "Voorspellingen"),
      body: text(
        "Open Predictions, choose the weekend and fill the finishing order and bonus picks. A saved draft is not a submission. Submit your complete picks and check for Submitted. After editing, save your changes before the deadline.",
        "Open Voorspellingen, kies het weekend en vul de eindvolgorde en bonuskeuzes in. Een opgeslagen concept is nog niet ingediend. Dien je complete keuzes in en controleer de status Ingediend. Sla wijzigingen na bewerken op voor de deadline.",
      ),
      tip: text(
        "Sprint weekends have separate GP and Sprint picks and deadlines. Check both tabs and the displayed closing times.",
        "Sprintweekenden hebben aparte GP- en Sprintkeuzes en deadlines. Controleer beide tabbladen en de getoonde sluitingstijden.",
      ),
      page: "predict",
      action: text("Open predictions", "Open voorspellingen"),
    },
    {
      icon: Bell,
      title: text("Give yourself a reminder", "Stel een herinnering in"),
      label: text("Reminders", "Herinneringen"),
      body: text(
        "Open your profile using your initials at the top. Under Push notifications, enable reminders on this device and allow browser notifications. You can also receive a notification when all weekend scores are published.",
        "Open je profiel via je initialen bovenaan. Schakel onder Pushmeldingen herinneringen op dit apparaat in en sta browsermeldingen toe. Je kunt ook een melding krijgen zodra alle weekendscores zijn gepubliceerd.",
      ),
      tip: text(
        "On iPhone or iPad, first add the app to your Home Screen and open it there. Availability and delivery depend on your browser and device settings.",
        "Voeg op iPhone of iPad de app eerst toe aan je beginscherm en open hem daar. Beschikbaarheid en bezorging hangen af van je browser en apparaatinstellingen.",
      ),
      page: "profile",
      action: text("Open notification settings", "Open meldingsinstellingen"),
    },
    {
      icon: CalendarDays,
      title: text("Plan your race weekend", "Plan je raceweekend"),
      label: text("Calendar", "Kalender"),
      body: text(
        "Race calendar shows session times and prediction deadlines. Use its calendar tools to download dates or subscribe to deadline updates in your calendar app.",
        "De racekalender toont sessietijden en voorspellingsdeadlines. Gebruik de kalendertools om datums te downloaden of je in je agenda-app te abonneren op deadline-updates.",
      ),
      tip: text(
        "A download is a snapshot. A subscription refreshes when your calendar app checks for updates; always check the app for the latest deadline.",
        "Een download is een momentopname. Een abonnement vernieuwt wanneer je agenda-app updates ophaalt; controleer de app altijd voor de laatste deadline.",
      ),
      page: "calendar",
      action: text("Open race calendar", "Open racekalender"),
    },
    {
      icon: Target,
      title: text("Think beyond one race", "Denk verder dan één race"),
      label: text("Season picks", "Seizoenskeuzes"),
      body: text(
        "Season picks is where you choose your championship predictions. These are separate from your weekend picks. Complete and save them before the displayed season deadline.",
        "Bij Seizoenskeuzes vul je je kampioenschapsvoorspellingen in. Deze staan los van je weekendkeuzes. Vul ze in en sla ze op voor de getoonde seizoensdeadline.",
      ),
      tip: text(
        "League & rules explains your league’s scoring. Check it before making your first picks.",
        "League & regels legt de puntentelling van je league uit. Bekijk dit voordat je je eerste keuzes maakt.",
      ),
      page: "champions",
      action: text("Open season picks", "Open seizoenskeuzes"),
    },
    {
      icon: Trophy,
      title: text("Follow the battle", "Volg de strijd"),
      label: text("Scores & rivals", "Scores & rivalen"),
      body: text(
        "Standings tracks the league table. Results & recap shows published results, while My season helps you review your performance. Weekend predictions lets you compare players once their picks are revealed.",
        "Standen toont de ranglijst. Uitslagen & terugblik toont gepubliceerde resultaten en Mijn seizoen laat je prestaties zien. Bij Weekendvoorspellingen vergelijk je spelers zodra hun keuzes openbaar zijn.",
      ),
      tip: text(
        "Picks stay private until their deadline. Scores appear after results are published; they may not be available immediately after the finish.",
        "Keuzes blijven privé tot hun deadline. Scores verschijnen nadat resultaten zijn gepubliceerd; dit kan even duren na de finish.",
      ),
      page: "leaderboard",
      action: text("Open standings", "Open standen"),
    },
  ];
  const current = steps[step];
  const Icon = current.icon;
  const remember = () => {
    try {
      localStorage.setItem(key, "seen");
    } catch {
      /* Guide remains available when storage is blocked. */
    }
  };
  const close = () => {
    remember();
    dialog.current?.close();
    trigger.current?.focus();
  };
  useEffect(() => {
    setStep(0);
    try {
      if (localStorage.getItem(key) !== "seen") dialog.current?.showModal();
    } catch {
      dialog.current?.showModal();
    }
    return () => dialog.current?.close();
  }, [key]);
  useEffect(() => {
    if (request) {
      setStep(0);
      dialog.current?.showModal();
    }
  }, [request]);
  return (
    <>
      <button
        ref={trigger}
        className="icon-button player-guide-trigger"
        title={text("Player guide", "Spelersgids")}
        aria-label={text("Player guide", "Spelersgids")}
        onClick={() => {
          setStep(0);
          dialog.current?.showModal();
        }}
      >
        <BookOpen size={19} />
      </button>
      <dialog
        ref={dialog}
        className="player-guide"
        aria-labelledby="player-guide-title"
        aria-describedby="player-guide-body"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="guide-top">
          <span>
            <Flag size={15} /> {text("YOUR FIRST LAP", "JE EERSTE RONDE")}
          </span>
          <button
            className="icon-button"
            onClick={close}
            aria-label={text("Close guide", "Sluit uitleg")}
          >
            <X size={20} />
          </button>
        </div>
        <div className="guide-layout">
          <nav
            className="guide-topics"
            aria-label={text("Guide topics", "Onderwerpen")}
          >
            {steps.map((item, index) => (
              <button
                key={item.page}
                aria-current={step === index ? "step" : undefined}
                onClick={() => setStep(index)}
              >
                <span>{index + 1}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <section
            className="guide-content"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="guide-icon">
              <Icon size={30} />
            </div>
            <p className="guide-count">
              {text("STEP", "STAP")} {step + 1} / {steps.length}
            </p>
            <h2 id="player-guide-title">{current.title}</h2>
            <p id="player-guide-body">{current.body}</p>
            <div className="guide-tip">{current.tip}</div>
            <button
              className="guide-destination"
              onClick={() => {
                close();
                onNavigate(current.page);
              }}
            >
              {current.action}
              <ChevronRight size={16} />
            </button>
          </section>
        </div>
        <div className="guide-footer">
          <button
            className="secondary"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            <ChevronLeft size={16} />
            {text("Back", "Terug")}
          </button>
          <button className="guide-later" onClick={close}>
            {text("Explore on my own", "Zelf ontdekken")}
          </button>
          <button
            className="primary"
            onClick={() =>
              step === steps.length - 1 ? close() : setStep(step + 1)
            }
          >
            {step === steps.length - 1
              ? text("Ready to race", "Klaar om te racen")
              : text("Next", "Volgende")}
            <ChevronRight size={16} />
          </button>
        </div>
      </dialog>
    </>
  );
}
