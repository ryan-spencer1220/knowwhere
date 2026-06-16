import { LegalScreen } from "@/components/legal-screen";
import { TERMS_OF_SERVICE } from "@/constants/legal";

export default function TermsScreen() {
  return <LegalScreen doc={TERMS_OF_SERVICE} />;
}
