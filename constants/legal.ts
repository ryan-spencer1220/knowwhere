// Single source for KnowWhere's legal text. Rendered in-app by
// app/legal/privacy.tsx + app/legal/terms.tsx and mirrored as standalone HTML
// in legal/*.html for hosting (App Store Connect requires a public Privacy URL).

export const LEGAL_EFFECTIVE_DATE = "June 15, 2026";
export const LEGAL_CONTACT_EMAIL = "ryan.spencer1220@gmail.com";

export type LegalSection = { heading: string; body: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDoc = {
  title: "Privacy Policy",
  intro:
    `This Privacy Policy explains what information KnowWhere ("we", "us") collects, how we use it, and the choices you have. By using KnowWhere you agree to this policy. Effective ${LEGAL_EFFECTIVE_DATE}.`,
  sections: [
    {
      heading: "Information you provide",
      body: [
        "Account: the email address and password you use to sign up (passwords are handled by our authentication provider and never stored by us in plain text).",
        "Profile: your display name, username, and any optional bio, city, and profile photo you add.",
        "Content: the lists you create, the places you save to them, and any notes you write.",
      ],
    },
    {
      heading: "Information collected automatically",
      body: [
        "Basic usage data needed to run the app, such as which lists you save (like) and who you follow.",
        "Approximate or precise location, only when you grant permission and only to center the map and show places near you. Your location is used to query nearby saved places and is not stored as a history or sold.",
      ],
    },
    {
      heading: "How we use information",
      body: [
        "To provide core features: creating and displaying lists, search, following, and showing nearby places.",
        "To keep the service safe, including reviewing reports of objectionable content and enforcing our Terms.",
        "We do not sell your personal information or use it for third-party advertising.",
      ],
    },
    {
      heading: "Public content",
      body: [
        "Lists you mark as public, along with your username, display name, and profile photo, are visible to other KnowWhere users. Lists you mark as private are visible only to you.",
      ],
    },
    {
      heading: "Service providers",
      body: [
        "Supabase provides our database, authentication, and file storage. Data you submit is stored on Supabase infrastructure.",
        "Google Places provides place search, details, and photos when you add or view a place. Searches you perform are sent to Google to return results.",
      ],
    },
    {
      heading: "Data retention and deletion",
      body: [
        "We keep your information for as long as your account exists.",
        "You can permanently delete your account at any time from Settings → Delete account. This removes your profile, lists, saved places, follows, and likes. Deletion is immediate and cannot be undone.",
      ],
    },
    {
      heading: "Security",
      body: [
        "We use industry-standard measures, including encrypted connections and database access controls, to protect your information. No method of transmission or storage is completely secure.",
      ],
    },
    {
      heading: "Children",
      body: ["KnowWhere is not directed to children under 13, and we do not knowingly collect information from them."],
    },
    {
      heading: "Changes",
      body: ["We may update this policy. Material changes will be reflected by updating the effective date above."],
    },
    {
      heading: "Contact",
      body: [`Questions about this policy? Email ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDoc = {
  title: "Terms of Service",
  intro:
    `These Terms govern your use of KnowWhere. By creating an account or using the app, you agree to these Terms and to our Privacy Policy. Effective ${LEGAL_EFFECTIVE_DATE}.`,
  sections: [
    {
      heading: "Eligibility and your account",
      body: [
        "You must be at least 13 years old to use KnowWhere.",
        "You are responsible for activity under your account and for keeping your credentials secure.",
      ],
    },
    {
      heading: "Your content",
      body: [
        "You retain ownership of the lists, places, notes, and profile details you create.",
        "You grant KnowWhere a non-exclusive license to host and display your content so the app can function, including showing your public lists to other users.",
      ],
    },
    {
      heading: "Acceptable use",
      body: [
        "There is zero tolerance for objectionable content or abusive behavior. You agree not to post content that is unlawful, hateful, harassing, threatening, sexually explicit, or otherwise objectionable, and not to harass or abuse other users.",
        "You agree not to impersonate others, spam, scrape, or attempt to disrupt or gain unauthorized access to the service.",
      ],
    },
    {
      heading: "Reporting and moderation",
      body: [
        "You can report objectionable content or users from within the app, and you can block users so you no longer see their content.",
        "We review reports of objectionable content and will act on them, which may include removing content and suspending or terminating the accounts of users who violate these Terms. We aim to act on reports within 24 hours.",
      ],
    },
    {
      heading: "Termination",
      body: [
        "You may delete your account at any time from Settings. We may suspend or terminate accounts that violate these Terms.",
      ],
    },
    {
      heading: "Disclaimers and limitation of liability",
      body: [
        "KnowWhere is provided “as is” without warranties of any kind. Place information is provided by third parties and may be inaccurate.",
        "To the maximum extent permitted by law, KnowWhere is not liable for any indirect or consequential damages arising from your use of the app.",
      ],
    },
    {
      heading: "Changes",
      body: ["We may update these Terms. Continued use after changes means you accept the updated Terms."],
    },
    {
      heading: "Contact",
      body: [`Questions about these Terms? Email ${LEGAL_CONTACT_EMAIL}.`],
    },
  ],
};
