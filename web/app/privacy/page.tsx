import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import styles from "./page.module.css";

export const metadata = {
  title: "Privacy — Longevity Compass",
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <SiteNav />

      <div className={styles.header}>
        <Link href="/settings" className={styles.backLink}>← Settings</Link>
        <span className="eyebrow">Privacy</span>
        <h1>What this app does with your data</h1>
        <p className={styles.headerSub}>
          There is no account and no server database. This page describes exactly what&apos;s
          stored, what ever leaves this device, and to whom — no vague reassurance, the actual
          mechanics.
        </p>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2>Where your data lives</h2>
          <p>
            Everything you enter — your profile, sleep and vitals check-ins, logged meals, workout
            sessions, mind and meditation entries, coach conversation history, and any Apple Health
            or 23andMe file you import — is written to this browser&apos;s local storage. It never
            leaves this device on its own, is never synced to a server, and this app has no login
            or account system to attach it to a person across devices.
          </p>
          <p>
            That also means it&apos;s only as durable as this browser profile: clearing your
            browser data, using a different browser, or a fresh install wipes it, unless you&apos;ve
            used the export tool in Settings first.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What gets sent externally, and when</h2>
          <p>
            Three kinds of requests leave this device, each only at the exact moment you trigger it —
            never in the background, never on a schedule:
          </p>
          <ul className={styles.list}>
            <li>
              <strong>A meal or fridge photo</strong> — sent to OpenAI once, to analyze that one
              photo. The image itself is not stored by this app after the response comes back.
            </li>
            <li>
              <strong>A Coach message or reflection note</strong> — sent to OpenAI and/or Anthropic
              once, along with a short plain-text summary of what you&apos;ve logged recently (so
              the reply can reference real numbers), to generate that one reply.
            </li>
            <li>
              <strong>A meditation or spoken-reply request</strong> — sent to OpenAI once, to
              synthesize that one audio clip.
            </li>
          </ul>
          <p>
            None of these providers are given a name, email, or account identifier from this app —
            there isn&apos;t one to give. What is sent is the content of that specific request. This
            app doesn&apos;t control how OpenAI or Anthropic themselves retain API traffic; consult
            their own API data-usage terms if that matters to you.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Genetic data (23andMe import)</h2>
          <p>
            Importing a 23andMe raw-data file is optional and entirely local: the file is parsed in
            this browser tab and the result is stored the same way as everything else — on this
            device, in local storage. It is not uploaded anywhere as part of the import itself.
          </p>
          <p>
            It follows the exact same externally-sent rule as everything above: it only reaches
            OpenAI or Anthropic if you explicitly ask the Coach something that draws on it, as part
            of that one request&apos;s context.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Apple Health import</h2>
          <p>
            Works the same way: you export <code>export.xml</code> from the Health app yourself and
            open it in this browser tab. Parsing happens locally; nothing is uploaded as part of the
            import.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Your controls</h2>
          <p>
            All in <Link href="/settings" className={styles.inlineLink}>Settings → Privacy &amp; data</Link>:
          </p>
          <ul className={styles.list}>
            <li>Turn off Coach web search, so replies never leave this app as a search query.</li>
            <li>Export everything you&apos;ve logged as one JSON file.</li>
            <li>Clear just your logged history, keeping your profile and preferences.</li>
            <li>Reset everything and start over from onboarding.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>What this app is not</h2>
          <p>
            This is a coaching tool, not a medical device, and not a diagnostic service. It doesn&apos;t
            claim to measure your biological age, and it says so plainly anywhere that language
            could be misread. Anything that looks like a medical concern gets a direct referral to a
            licensed professional instead of a guess.
          </p>
        </section>
      </div>
    </div>
  );
}
