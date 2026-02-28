import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

// Support both AUTH_SECRET and NEXTAUTH_SECRET naming conventions
const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

// Startup validation - log clear error if secret is missing
if (typeof window === "undefined") {
  if (!secret) {
    console.error("============================================");
    console.error("[Auth] CRITICAL: Missing AUTH_SECRET / NEXTAUTH_SECRET");
    console.error("[Auth] Authentication WILL NOT WORK without this env var");
    console.error("[Auth] Generate one with: npx auth secret");
    console.error("============================================");
  } else {
    console.log("[Auth] Secret configured successfully");
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: secret || "fallback-secret-for-build-only",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Check for secret at runtime
        if (!secret) {
          console.error("[Auth] Cannot authorize: AUTH_SECRET not set");
          throw new Error("Configuration");
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        try {
          const sql = getDb();

          // Check if email is in allowed_users
          const allowed = await sql`
            SELECT * FROM allowed_users WHERE email = ${email.toLowerCase()}
          `;

          if (allowed.length === 0) {
            console.log("[Auth] Email not in allowed_users:", email);
            return null;
          }

          // Check if user exists
          const users = await sql`
            SELECT * FROM users WHERE email = ${email.toLowerCase()}
          `;

          if (users.length === 0) {
            // First-time login - create user with this password
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = await sql`
              INSERT INTO users (email, password_hash, display_name)
              VALUES (${email.toLowerCase()}, ${hashedPassword}, ${email.split("@")[0]})
              RETURNING id, email, display_name
            `;

            console.log("[Auth] Created new user:", email);
            return {
              id: newUser[0].id,
              email: newUser[0].email,
              name: newUser[0].display_name,
            };
          }

          // Existing user - verify password
          const user = users[0];
          const passwordMatch = await bcrypt.compare(password, user.password_hash);

          if (!passwordMatch) {
            console.log("[Auth] Invalid password for:", email);
            return null;
          }

          console.log("[Auth] Login successful:", email);
          return {
            id: user.id,
            email: user.email,
            name: user.display_name,
          };
        } catch (error) {
          console.error("[Auth] Database error during authorization:", error);
          // Return null for auth errors, don't throw (except configuration)
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
});
