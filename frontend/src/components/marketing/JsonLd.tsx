/** Données structurées JSON-LD. Le « < » est échappé : aucune valeur ne peut refermer la balise <script>. */
export default function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
