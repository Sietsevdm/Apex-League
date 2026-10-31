export function teamLogo(team: string) {
  const key = team.toLowerCase().replace(/[^a-z0-9]/g, "");
  const teams: [string, string][] = [
    ["mclaren", "mclaren"],
    ["ferrari", "ferrari"],
    ["mercedes", "mercedes"],
    ["astonmartin", "astonmartin"],
    ["williams", "williams"],
    ["alpine", "alpine"],
    ["racingbull", "racingbulls"],
    ["redbull", "redbullracing"],
    ["haas", "haasf1team"],
    ["audi", "audi"],
    ["cadillac", "cadillac"],
  ];
  const match = teams.find(([name]) => key.includes(name));
  return match
    ? `/team-logos/${match[1]}.webp`
    : key === "rbf1team" || key === "rb"
      ? "/team-logos/racingbulls.webp"
      : undefined;
}
