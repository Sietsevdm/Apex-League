"use client";
import type { Call } from "@/lib/client-data";
import { useLocale } from "@/lib/i18n";
import { Season, State, locked } from "@/lib/model";
import { registrationOpen } from "@/lib/season-controls";
import { Copy } from "lucide-react";
import { useState } from "react";
function Members({
  s,
  season,
  meId,
  call,
}: {
  s: State;
  season?: Season;
  meId: string;
  call: Call;
}) {
  const { t: tr, language, setLanguage, date } = useLocale();
  const [copied, setCopied] = useState(false);
  const open = season && registrationOpen(season);
  return (
    <>
      <section className="panel">
        <h2>{tr("Player registration")}</h2>
        <p className="muted">
          {tr(
            "Open or close registration manually for each active season. Archived seasons must be reopened first.",
          )}
        </p>
        {s.seasons.map((item) => (
          <div className="registration-row" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <p className="tiny">
                {tr(
                  item.archived
                    ? "Archived"
                    : registrationOpen(item)
                      ? "Registration open"
                      : "Registration closed",
                )}
              </p>
            </div>
            <div className="button-row">
              <button
                className="secondary"
                disabled={item.archived}
                onClick={() =>
                  call({
                    action: "registration",
                    seasonId: item.id,
                    closed: registrationOpen(item),
                  })
                }
              >
                {tr(
                  registrationOpen(item)
                    ? "Close registration"
                    : "Open registration",
                )}
              </button>
              {item.archived && (
                <button
                  className="secondary"
                  onClick={() =>
                    call({
                      action: "archive",
                      seasonId: item.id,
                      archived: false,
                    })
                  }
                >
                  {tr("Reopen season")}
                </button>
              )}
            </div>
          </div>
        ))}
        {!s.seasons.length && (
          <p className="muted">
            {tr(
              "Create a season in Racing → Seasons & lineup to manage registration.",
            )}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>{tr("Invite your friends")}</h2>
        <p className="muted">
          {tr(
            open
              ? "Registration is open until you close it."
              : "Registration is closed. Reopen it to invite more players.",
          )}
        </p>
        <div className="invite-box">
          <code>
            {tr(
              typeof location !== "undefined"
                ? `${location.origin}/?invite=${s.settings.invite}`
                : "",
            )}
          </code>
          <button
            className="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(
                `${location.origin}/?invite=${s.settings.invite}`,
              );
              setCopied(true);
            }}
          >
            <Copy size={15} />
            {tr(copied ? "Copied" : "Copy link")}
          </button>
        </div>
        <button
          className="text-button"
          onClick={() => call({ action: "rotateInvite" })}
        >
          {tr("Revoke this link and create a new one")}
        </button>
      </section>
      <section className="panel">
        <h2>{tr("Manage the grid")}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("PLAYER")}</th>
                <th>{tr("EMAIL")}</th>
                <th>{tr("ROLE")}</th>
                <th>{tr("ACCESS")}</th>
                <th>{tr("SEASON")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tr(
                s.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{tr(u.email)}</td>
                    <td>
                      <select
                        disabled={u.id === meId}
                        value={u.role}
                        onChange={(e) =>
                          call({
                            action: "member",
                            id: u.id,
                            role: e.target.value,
                          })
                        }
                      >
                        <option value="player">{tr("Player")}</option>
                        <option value="admin">{tr("Organiser")}</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={u.id === meId}
                        onClick={() =>
                          call({
                            action: "member",
                            id: u.id,
                            active: !u.active,
                          })
                        }
                      >
                        {tr(u.active ? "Active · revoke" : "Revoked · restore")}
                      </button>
                    </td>
                    <td>
                      {tr(
                        u.seasonIds.includes(season?.id || "") ? (
                          "Registered"
                        ) : (
                          <button
                            className="text-button"
                            disabled={!open}
                            onClick={() =>
                              call({
                                action: "member",
                                id: u.id,
                                seasonId: season?.id,
                              })
                            }
                          >
                            {tr("Add to season")}
                          </button>
                        ),
                      )}
                    </td>
                    <td>
                      {tr(
                        u.id !== meId && (
                          <button
                            className="text-button"
                            onClick={() => {
                              const password = window.prompt(
                                `Enter a new temporary password for ${u.name} (at least 12 characters). Share it with them privately.`,
                              );
                              if (password)
                                call({
                                  action: "resetPassword",
                                  id: u.id,
                                  password,
                                });
                            }}
                          >
                            {tr("Reset access")}
                          </button>
                        ),
                      )}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h2>{tr("Missing-entry reminder list")}</h2>
        <p className="muted">
          {tr(
            "Players who opted into reminders and have not submitted for an open event.",
          )}
        </p>
        {tr(
          s.events
            .filter(
              (e) =>
                e.seasonId === season?.id &&
                !e.practiceRound &&
                !locked(e, "gp"),
            )
            .map((e) => (
              <div className="announcement" key={e.id}>
                <h3>{e.name}</h3>
                <p>
                  {tr(
                    s.users
                      .filter(
                        (u) =>
                          u.active &&
                          u.reminders &&
                          u.seasonIds.includes(e.seasonId) &&
                          !s.entries.some(
                            (p) =>
                              p.userId === u.id &&
                              p.eventId === e.id &&
                              p.kind === "gp" &&
                              p.submitted,
                          ),
                      )
                      .map((u) => u.name)
                      .join(", ") || "Nobody needs a reminder.",
                  )}
                </p>
              </div>
            )),
        )}
        <p className="tiny">
          {tr(
            "Automatic email sending is not connected yet. This list can be used immediately.",
          )}
        </p>
      </section>
    </>
  );
}

export default Members;
