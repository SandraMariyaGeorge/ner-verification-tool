"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signup } from "../../lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Create your account to start project-based verification.");

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setStatus("Name, email and password are required.");
      return;
    }

    try {
      await signup({ name: name.trim(), email: email.trim(), password });
      setStatus("Signup successful. You can now login.");
      router.push("/login");
    } catch (error) {
      setStatus(error.message || "Signup failed.");
    }
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>Signup</h2>
        <div className="controls-row">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleSignup}>Create Account</button>
        </div>
        <p className="small">Already have an account? <Link href="/login">Login</Link></p>
      </section>

      <section className="card">
        <h3>Status</h3>
        <p>{status}</p>
      </section>
    </div>
  );
}
