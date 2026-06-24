import type { Metadata } from "next";

import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms"
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="June 24, 2026">
      <p>
        These terms apply to your use of WhereWasIt.ai during the public alpha period. By using the
        site, you agree to use it responsibly and understand the limits of an early-stage product.
      </p>

      <h2>What The Product Does</h2>
      <p>
        WhereWasIt.ai helps users retrace clues, organize a likely search order, and generate a
        practical lost-item recovery report. It is not a prediction service and does not guarantee
        that an item will be found.
      </p>

      <h2>Alpha Status</h2>
      <p>
        This is a public alpha. Features may change quickly, reliability may vary, and the service
        may be updated, limited, or removed at any time.
      </p>

      <h2>No Guarantee</h2>
      <p>
        The product is offered on an as-is basis for informational and practical search support. We
        do not guarantee accuracy, availability, completeness, or recovery of any lost item.
      </p>

      <h2>Acceptable Use</h2>
      <p>
        You agree not to misuse the service, interfere with its operation, attempt to exploit or
        overload it, or submit unlawful or harmful content.
      </p>

      <h2>Your Content</h2>
      <p>
        You are responsible for the text you submit. Please do not include confidential or
        unnecessary sensitive information.
      </p>

      <h2>Feedback</h2>
      <p>
        If you submit feedback, including whether a suggestion helped you find an item, we may use
        that feedback to improve the service without compensation or attribution.
      </p>

      <h2>Third-Party Services</h2>
      <p>
        The app may rely on third-party hosting, analytics, and model providers. Their outages,
        limitations, or policy changes may affect the service.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, the operators of this alpha are not liable for
        losses, damages, or decisions arising from use of the service or reliance on its output.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated as the product evolves. Continued use after changes means you
        accept the updated terms.
      </p>
    </LegalPage>
  );
}
