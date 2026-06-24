import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy"
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="June 24, 2026">
      <p>
        WhereWasIt.ai is a public alpha product. This policy explains what we collect, what we do
        with it, and how we try to keep the experience lightweight and respectful.
      </p>

      <h2>What We Collect</h2>
      <p>
        When you use the app, we may process the text you submit about a lost item, the generated
        recovery report, lightweight product analytics events, and basic technical request data
        needed to operate the service.
      </p>

      <h2>How We Use It</h2>
      <p>
        We use this information to generate your search plan, monitor reliability, understand which
        parts of the alpha experience are useful, and improve the product over time.
      </p>

      <h2>Analytics</h2>
      <p>
        We log lightweight analytics events such as page views, analysis starts, analysis success
        or error events, and feedback button clicks. In this alpha stage, analytics may be stored
        in server logs or through future analytics providers we enable.
      </p>

      <h2>AI Providers</h2>
      <p>
        The app may send structured narration requests to third-party model providers through
        OpenRouter when an AI-written report is generated. The local reasoning engine does the core
        analysis first, and the model is used to narrate the result for readability.
      </p>

      <h2>Data Retention</h2>
      <p>
        We are aiming to keep this alpha lightweight. We do not currently offer persistent user
        accounts or user dashboards, and we do not promise long-term storage of submitted content.
      </p>

      <h2>Children</h2>
      <p>
        WhereWasIt.ai is not designed for children under 13. If you believe a child has submitted
        personal information, please contact the operator of the deployment so the data can be
        reviewed and removed if possible.
      </p>

      <h2>Your Responsibility</h2>
      <p>
        Please avoid entering highly sensitive personal, financial, medical, or legal details that
        are not necessary for a lost-item search. Keep your description focused on the item,
        timeline, and places involved.
      </p>

      <h2>Changes</h2>
      <p>
        This policy may change as the alpha evolves. If it does, the updated date at the top of
        this page will change as well.
      </p>
    </LegalPage>
  );
}
