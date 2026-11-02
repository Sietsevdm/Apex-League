import { version } from "../package.json";

/** Required by Jolpica on both its Ergast and session APIs. */
export const providerHeaders = { "User-Agent": `ApexPredictionLeague/${version}` };
