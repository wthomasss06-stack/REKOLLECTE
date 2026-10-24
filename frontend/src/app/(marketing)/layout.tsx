import Footer from "@/components/marketing/Footer";
import Header from "@/components/marketing/Header";
import FeedbackWidget from "@/components/FeedbackWidget";
import SmoothScroll from "@/components/marketing/SmoothScroll";
import FigureMotion from "@/components/marketing/figures/FigureMotion";
import "@/components/marketing/figures/figures.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <div>
        <Header />
        <main className="pt-[72px]"><FigureMotion>{children}</FigureMotion></main>
        <Footer />
        <FeedbackWidget />
      </div>
    </SmoothScroll>
  );
}
