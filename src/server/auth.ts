/**
 * Auth.js (next-auth v5) configuration: email magic-link auth backed by the Prisma
 * adapter with database sessions. Creates a UserSettings row on first sign-in.
 */
import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import { prisma } from "./db";

// Provider selection:
//  - EMAIL_SERVER set        -> real SMTP magic link (production / configured dev).
//  - dev, no EMAIL_SERVER    -> magic link is printed to the server console (no SMTP needed).
//  - production, no SMTP     -> no providers (keeps `next build` and imports crash-free).
// All paths use the same Auth.js email flow + Prisma adapter, so signing in with an
// existing email (e.g. the seeded demo@example.com) logs into that user.
function buildProviders(): NextAuthConfig["providers"] {
  if (process.env.EMAIL_SERVER) {
    return [Nodemailer({ server: process.env.EMAIL_SERVER, from: process.env.EMAIL_FROM })];
  }
  if (process.env.NODE_ENV !== "production") {
    return [
      Nodemailer({
        // Dummy transport — never connects because sendVerificationRequest is overridden.
        server: { host: "localhost", port: 1025, auth: { user: "dev", pass: "dev" } },
        from: process.env.EMAIL_FROM ?? "dev@localhost",
        async sendVerificationRequest({ identifier, url }) {
          console.log(`\n🔑  [dev] Sign-in link for ${identifier}:\n${url}\n`);
        },
      }),
    ];
  }
  return [];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  providers: buildProviders(),
  callbacks: {
    // Surface the DB user id on the session object.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await prisma.userSettings.create({ data: { userId: user.id } });
      }
    },
  },
});
