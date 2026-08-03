"use client";

import { type CSSProperties, type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message ?? "Sign in failed");
      return;
    }
    router.push("/create-quiz");
  }

  return (
    <main style={page}>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={card}>
        <label style={label}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label style={label}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      <p>
        No account? <Link href="/register">Register</Link>
      </p>
    </main>
  );
}

const page: CSSProperties = {
  maxWidth: 420,
  margin: "40px auto",
  padding: 24,
  display: "grid",
  gap: 16,
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
};
const card: CSSProperties = { display: "grid", gap: 12 };
const label: CSSProperties = { display: "grid", gap: 4 };
