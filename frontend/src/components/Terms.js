import React from 'react';
import { LegalPageShell, Section, Bullets } from './legal/LegalPageShell';

// Plain-language terms of service.
// NOTE: good-faith, not lawyer-reviewed — see decision note 2026-06-22.
export const Terms = () => (
  <LegalPageShell title="Terms of Service" lastUpdated="June 22, 2026">
    <p className="text-zinc-400">
      These Terms govern your use of LaunchBusiness AI ("the service"), operated by NovaJay
      Tech. By creating an account or using the service, you agree to these Terms. The service
      is currently offered as a beta and may change.
    </p>

    <Section heading="Your account">
      <Bullets items={[
        'You must provide accurate information and keep your login credentials secure.',
        'You are responsible for all activity under your account.',
        'You must be able to form a binding contract and use the service for a lawful business purpose.',
      ]} />
    </Section>

    <Section heading="Acceptable use">
      <p>You agree not to:</p>
      <Bullets items={[
        'Submit URLs or content that are unlawful, infringing, malicious, or that you do not have the right to use.',
        'Attempt to bypass security controls, rate limits, URL safety checks, or plan limits.',
        'Use the service to generate content that is deceptive, harassing, or violates the rights of others.',
        'Resell or redistribute the service except as expressly permitted by your plan.',
      ]} />
    </Section>

    <Section heading="Your content & ownership">
      <p>
        You retain ownership of the inputs you provide. Subject to these Terms and your active
        plan, you may use the logos, videos, scripts, posters, and documents you generate for
        your own business. You are responsible for reviewing generated output before relying on
        or publishing it.
      </p>
    </Section>

    <Section heading="Legal documents are not legal advice">
      <p>
        The legal-document generator produces drafts for informational purposes based on the
        information you provide and publicly available context. It is{' '}
        <strong>not a substitute for advice from a licensed attorney</strong>, and using it does
        not create a lawyer–client relationship. Every generated document should be reviewed by
        qualified counsel for your jurisdiction before use. We make no warranty that any
        document is complete, current, or fit for a particular purpose.
      </p>
    </Section>

    <Section heading="Plans, billing & cancellation">
      <Bullets items={[
        'Paid plans and credit top-ups are billed through Stripe. Subscriptions renew until cancelled.',
        'You can manage or cancel your subscription from the billing portal. Cancellation stops future charges; it does not refund the current period unless required by law.',
        'Deleting your account cancels active subscriptions on a best-effort basis — cancel explicitly first if you want to be certain.',
        'Plan limits and prices may change; we will give reasonable notice of material changes.',
      ]} />
    </Section>

    <Section heading="Service availability">
      <p>
        The service is provided "as is" and "as available". As a beta product it may have
        downtime, change, or be discontinued. We do not guarantee uninterrupted or error-free
        operation.
      </p>
    </Section>

    <Section heading="Limitation of liability">
      <p>
        To the maximum extent permitted by law, NovaJay Tech is not liable for indirect,
        incidental, or consequential damages, or for any loss arising from your use of generated
        content. Our total liability for any claim relating to the service is limited to the
        amount you paid us in the twelve months before the claim.
      </p>
    </Section>

    <Section heading="Termination">
      <p>
        You may stop using the service and delete your account at any time. We may suspend or
        terminate accounts that violate these Terms or that we reasonably believe pose a risk to
        the service or other users.
      </p>
    </Section>

    <Section heading="Contact">
      <p>
        Questions about these Terms? Email{' '}
        <a className="text-indigo-400 hover:text-indigo-300" href="mailto:support@launchbusinessai.com">
          support@launchbusinessai.com
        </a>. We may update these Terms from time to time and will revise the "last updated" date
        above when we do.
      </p>
    </Section>
  </LegalPageShell>
);

export default Terms;
