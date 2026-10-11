import Link from "next/link";

import JsonLd from "@/components/marketing/JsonLd";
import { breadcrumb, faqPage } from "@/lib/jsonld";
import { IDS, SEO_UPDATED_ISO, SEO_UPDATED_LABEL, SITE_URL } from "@/lib/site";

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoLink {
  href: string;
  title: string;
  text: string;
}

/** Tableau comparatif : la première colonne sert d'intitulé de ligne. Défilement horizontal sur mobile. */
export function SeoTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{head.map((cell, index) => <th key={index} scope="col">{cell}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) => (index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Maillage interne : chaque page de référencement renvoie vers les pages voisines, avec un texte de lien explicite. */
function SeoRelated({ links }: { links: SeoLink[] }) {
  return (
    <nav aria-label="Pour aller plus loin" className="mt-12">
      <h2 className="text-xl font-bold tracking-[-0.01em] text-mk-ink">Pour aller plus loin</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="block h-full rounded-xl border border-border bg-surface p-4 transition hover:border-mk-ink/40">
              <span className="block text-sm font-bold text-mk-ink">{link.title}</span>
              <span className="mt-1 block text-[13px] leading-snug text-mk-moss">{link.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface SeoPageProps {
  /** Chemin canonique de la page (ex. « /gestion-visiteurs-qr-code »). */
  path: string;
  /** Titre H1 : un seul par page, il porte l'intention de recherche principale. */
  h1: string;
  description: string;
  /** Libellé du dernier élément fil d'Ariane (nom court de la page). */
  crumb: string;
  /** Réponse directe, affichée en premier : c'est l'extrait que reprennent Google et les moteurs de réponse. */
  answer: React.ReactNode;
  faqs: SeoFaq[];
  /** Pages voisines à relier (maillage interne), affichées sous la FAQ. */
  related: SeoLink[];
  kind?: "WebPage" | "Article";
  /** Date de première publication (Article). Par défaut : la date de révision. */
  publishedIso?: string;
  children: React.ReactNode;
}

/** Gabarit des pages de référencement : fil d'Ariane, H1, réponse directe, contenu, FAQ, appel à l'action et JSON-LD
 * (WebPage ou Article, BreadcrumbList, FAQPage) reliés par @id au reste du site. Composant serveur : tout part dans le HTML initial. */
export default function SeoPage({ path, h1, description, crumb, answer, faqs, related, kind = "WebPage", publishedIso = SEO_UPDATED_ISO, children }: SeoPageProps) {
  const url = `${SITE_URL}${path}`;
  const crumbs = [{ name: "Accueil", path: "/" }, { name: crumb, path }];
  const page = kind === "Article"
    ? {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: h1,
        description,
        inLanguage: "fr",
        datePublished: publishedIso,
        dateModified: SEO_UPDATED_ISO,
        mainEntityOfPage: url,
        author: { "@id": IDS.publisher },
        publisher: { "@id": IDS.publisher },
        about: { "@id": IDS.app },
        isPartOf: { "@id": IDS.website },
      }
    : {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: h1,
        description,
        inLanguage: "fr",
        datePublished: publishedIso,
        dateModified: SEO_UPDATED_ISO,
        isPartOf: { "@id": IDS.website },
        about: { "@id": IDS.app },
        publisher: { "@id": IDS.publisher },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      };
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [page, { ...breadcrumb(crumbs), "@id": `${url}#breadcrumb` }, faqPage(`${url}#faq`, faqs)],
  };

  return (
    <article className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
      <JsonLd data={jsonLd} />

      <nav aria-label="Fil d’Ariane" className="text-xs text-mk-moss">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li><Link href="/" className="underline-offset-4 hover:underline">Accueil</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-mk-ink">{crumb}</li>
        </ol>
      </nav>

      <p className="mt-6 font-mk-mono text-[10px] uppercase tracking-[0.1em] text-mk-moss">Dernière mise à jour : {SEO_UPDATED_LABEL}</p>
      <h1 className="mt-3 text-balance text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{h1}</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-5 text-base leading-relaxed text-mk-ink sm:p-6">{answer}</div>

      <div className="prose-legal mt-8 max-w-none text-[15px] leading-relaxed text-mk-ink/85">
        {children}

        <h2 id="faq">Questions fréquentes</h2>
        {faqs.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </div>

      <SeoRelated links={related} />

      <div className="mt-10">
        <Link href="/connexion" className="lp-btn" style={{ textDecoration: "none", color: "rgb(var(--c-cta-ink))" }}>Créer mon espace</Link>
      </div>
    </article>
  );
}
