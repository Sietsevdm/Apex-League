import { version } from "../package.json";

/** Identify the installed app when requesting external race data. */
export const providerHeaders = { "User-Agent": `ApexPredictionLeague/${version}` };
