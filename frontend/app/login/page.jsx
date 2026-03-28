"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Login to manage your NER projects.");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setStatus("Email and password are required.");
      return;
    }

    try {
      const data = await login({ email: email.trim(), password });
      window.localStorage.setItem("activeUser", JSON.stringify(data));
      setStatus("Login successful.");
      router.push("/dashboard");
    } catch (error) {
      setStatus(error.message || "Login failed.");
    }
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Login</h2>
        <div className="controls-row">
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleLogin}>Login</button>
        </div>
        <p className="small">New here? <Link href="/signup">Create account</Link></p>
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>{status}</p>
      </section>
    </div>
  );
}
