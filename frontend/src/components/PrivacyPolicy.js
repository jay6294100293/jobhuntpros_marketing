import React from 'react';
import { LegalPageShell, Section, Bullets } from './legal/LegalPageShell';

// Plain-language privacy policy grounded in what the app actually collects.
// NOTE: good-faith, not lawyer-reviewed — see decision note 2026-06-22.
export const PrivacyPolicy = () => (
  <LegalPageShell title="Privacy Policy" lastUpdated="June 22, 2026">
    <p className="text-zinc-400">
      LaunchBusiness AI ("we", "us") is operated by NovaJay Tech. This policy explains what
      personal data we collect when you use <strong>launchbusinessai.com</strong>, why we
      collect it, and the choices you have. We collect only what we need to run the service.
    </p>

    <Section heading="Information we collect">
      <Bullets items={[
        'Account data: your name, email address, and a securely hashed password (we never store your password in plain text). If you sign in with Google, we receive your Google account email and basic profile.',
        'Content you create: product URLs you submit, generated logos, videos, scripts, posters, brand profiles, and the business information you enter to generate legal documents.',
        'Billing data: your Stripe customer identifier and subscription/plan status. Card details are handled entirely by Stripe — we never see or store your full card number.',
        'Usage data: counts of videos, scripts, posters, and legal documents you generate, to enforce plan limits.',
        'Technical data: your IP address (used for rate limiting and abuse prevention) and standard request metadata.',
        'Diagnostics & analytics: error reports via Sentry and product analytics via PostHog, used to keep the service stable and improve it.',
      ]} />
    </Section>

    <Section heading="How we use your data">
      <Bullets items={[
        'To provide the service: generate your marketing and legal content and store it in your account.',
        'To operate billing and enforce the limits of your plan.',
        'To secure the platform — detect abuse, prevent fraudulent or malicious URL scraping, and rate-limit requests.',
        'To diagnose errors and understand which features are used, so we can improve them.',
        'To contact you about your account (for example, password resets and important service notices).',
      ]} />
    </Section>

    <Section heading="URLs you submit">
      <p>
        When you paste a product URL, we fetch that page to extract brand details (colours,
        headline, features). We process the page to produce your content and do not crawl
        beyond it or retain the scraped page after generation completes.
      </p>
    </Section>

    <Section heading="Sharing & processors">
      <p>We do not sell your personal data. We share data only with the service providers that make the product work, acting as our processors:</p>
      <Bullets items={[
        'Stripe — payments and subscription management.',
        'Google (Gemini) — AI generation of scripts, logos, and legal documents.',
        'Modal — GPU video generation for paid plans (where applicable).',
        'Sentry — error monitoring. PostHog — product analytics.',
        'Email delivery providers — transactional email such as password resets.',
      ]} />
      <p>We may also disclose data where required by law or to protect the rights and safety of our users and the service.</p>
    </Section>

    <Section heading="Data retention & deletion">
      <p>
        We keep your account data for as long as your account is active. You can permanently
        delete your account and associated personal data at any time from{' '}
        <strong>Settings → Delete account</strong>. When you do, we remove your generated
        content, profiles, and usage records. We retain records of completed transactions
        where we are required to for financial and legal record-keeping obligations.
      </p>
    </Section>

    <Section heading="Your rights">
      <p>
        Depending on where you live (for example under the GDPR, PIPEDA, or CCPA), you may have
        the right to access, correct, export, or delete your personal data, and to object to or
        restrict certain processing. You can exercise account deletion directly in the app, or
        contact us for any other request.
      </p>
    </Section>

    <Section heading="Children">
      <p>
        The service is intended for businesses and adults. It is not directed to children under
        16, and we do not knowingly collect their personal data.
      </p>
    </Section>

    <Section heading="Contact">
      <p>
        Questions about this policy or your data? Email{' '}
        <a className="text-indigo-400 hover:text-indigo-300" href="mailto:privacy@launchbusinessai.com">
          privacy@launchbusinessai.com
        </a>. We may update this policy from time to time; we will revise the "last updated"
        date above when we do.
      </p>
    </Section>
  </LegalPageShell>
);

export default PrivacyPolicy;
