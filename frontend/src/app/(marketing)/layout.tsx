import Footer from "@/components/marketing/Footer";
import Header from "@/components/marketing/Header";
import FeedbackWidget from "@/components/FeedbackWidget";
import SmoothScroll from "@/components/marketing/SmoothScroll";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <div>
        <Header />
        <main className="pt-[72px]">{children}</main>
        <Footer />
        <FeedbackWidget />
      </div>
    </SmoothScroll>
  );
}
