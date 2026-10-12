import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { State, User } from "./model";
import { verifyPassword } from "./auth";
export async function passkeyAction(
  s: State,
  u: User | undefined,
  b: Record<string, any>,
  challengeId: string,
) {
  const origin = process.env.APP_URL;
  if (
    !origin ||
    (!origin.startsWith("https://") &&
      new URL(origin).hostname !== "localhost" &&
      new URL(origin).hostname !== "127.0.0.1")
  )
    throw new Error("Passkeys require a configured HTTPS domain.");
  const rpID = new URL(origin).hostname;
  s.passkeyChallenges = (s.passkeyChallenges || [])
    .filter((c) => c.expires > Date.now())
    .slice(-500);
  if (
    b.action === "passkeyLoginOptions" ||
    b.action === "passkeyRegisterOptions"
  ) {
    const registering = b.action === "passkeyRegisterOptions";
    if (
      registering &&
      (!u ||
        typeof b.password !== "string" ||
        !verifyPassword(b.password, u.password))
    )
      throw new Error("Enter your current password to add a passkey.");
    const options = registering
      ? await generateRegistrationOptions({
          rpName: s.settings.name,
          rpID,
          userID: new TextEncoder().encode(u!.id),
          userName: u!.email,
          userDisplayName: u!.name,
          attestationType: "none",
          excludeCredentials: (u!.passkeys || []).map((k) => ({ id: k.id })),
          authenticatorSelection: {
            residentKey: "required",
            userVerification: "required",
          },
        })
      : await generateAuthenticationOptions({
          rpID,
          userVerification: "required",
        });
    const id = randomUUID();
    s.passkeyChallenges.push({
      id,
      challenge: options.challenge,
      purpose: registering ? "register" : "login",
      userId: registering ? u!.id : undefined,
      expires: Date.now() + 300000,
    });
    return { options, challengeId: id };
  }
  const index = s.passkeyChallenges.findIndex(
    (c) =>
      c.id === challengeId &&
      c.purpose ===
        (b.action === "passkeyRegisterVerify" ? "register" : "login"),
  );
  if (index < 0)
    throw new Error("Passkey request expired. Please start again.");
  const [challenge] = s.passkeyChallenges.splice(index, 1);
  if (b.action === "passkeyRegisterVerify") {
    if (!u || u.id !== challenge.userId)
      throw new Error("Please sign in again.");
    const result = await verifyRegistrationResponse({
      response: b.response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!result.verified || !result.registrationInfo)
      throw new Error("Passkey verification failed.");
    const { credential } = result.registrationInfo;
    if (
      s.users.some((user) => user.passkeys?.some((k) => k.id === credential.id))
    )
      throw new Error("This passkey is already registered.");
    u.passkeys ??= [];
    if (u.passkeys.length >= 10)
      throw new Error("Remove an old passkey before adding another.");
    u.passkeys.push({
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64"),
      counter: credential.counter,
      name: String(b.name || "My passkey").slice(0, 60),
      createdAt: new Date().toISOString(),
    });
    return { user: u };
  }
  const user = s.users.find(
    (user) =>
      user.active && user.passkeys?.some((k) => k.id === b.response?.id),
  );
  const credential = user?.passkeys?.find((k) => k.id === b.response?.id);
  if (!user || !credential) throw new Error("Passkey verification failed.");
  const result = await verifyAuthenticationResponse({
    response: b.response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
    credential: {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey, "base64"),
      counter: credential.counter,
    },
  });
  if (!result.verified) throw new Error("Passkey verification failed.");
  credential.counter = result.authenticationInfo.newCounter;
  return { user };
}
