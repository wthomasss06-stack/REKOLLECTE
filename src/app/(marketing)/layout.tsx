import Footer from "@/components/marketing/Footer";
import Header from "@/components/marketing/Header";
import SmoothScroll from "@/components/marketing/SmoothScroll";
import FeedbackWidget from "@/components/FeedbackWidget";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      <SmoothScroll />
      <Header />
      <main>{children}</main>
      <Footer />
      <FeedbackWidget />
    </div>
  );
}
