import { LegalScreen } from "@/components/legal-screen";
import { PRIVACY_POLICY } from "@/constants/legal";

export default function PrivacyScreen() {
  return <LegalScreen doc={PRIVACY_POLICY} />;
}
