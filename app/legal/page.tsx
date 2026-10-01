import Link from "next/link";

import { siteConfig } from "@/config/site";
import { ContactEmail, LegalPage, Section } from "@/components/legal-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Legal notice (mentions légales)",
  description:
    "The legal notice of Taylor's Secret Garden, in French and English: who publishes the site, who hosts it, how to reach them, and who owns what on it.",
  path: "/legal",
});

/*
  The host, as LCEN art. 6-III requires it be named: the address and contact
  Vercel publishes in its terms and privacy policy (vercel.com/legal).
*/
// TODO(owner): LCEN asks for the host's phone number too; Vercel publishes none on vercel.com/legal.
const HOST = {
  name: "Vercel Inc.",
  address: ["440 N Barranca Ave #4133", "Covina, CA 91723"],
  email: "legalnotices@vercel.com",
  url: "https://vercel.com",
};

const REPOSITORY = "https://github.com/Eragon67360/taylorssecretgarden";

function HostAddress({ country }: { country: string }) {
  return (
    <address className="not-italic">
      {HOST.name}
      <br />
      {HOST.address[0]}
      <br />
      {HOST.address[1]}, {country}
      <br />
      <a href={`mailto:${HOST.email}`}>{HOST.email}</a> · <a href={HOST.url}>vercel.com</a>
    </address>
  );
}

/**
 * The legal notice (mentions légales, LCEN art. 6-III): French first, as the
 * law asks of a site published from France, then the same in English. The
 * publisher is a private individual publishing on a non-professional basis,
 * so his home address and phone number are given to the host only
 * (art. 6-III-2).
 */
export default function LegalNoticePage() {
  return (
    <LegalPage
      contents={[
        { id: "fr", title: "Mentions légales, en français", lang: "fr" },
        { id: "en", title: "Legal notice, in English" },
      ]}
      intro="Who publishes this fan site, who hosts it, and how to reach them: in French, as French law asks, then in English."
      kicker="the small print · who's who"
      title={<span lang="fr">Mentions légales</span>}
      updated="1 October 2026"
    >
      <Section id="fr" lang="fr" title="En français">
        <h3>Éditeur et directeur de la publication</h3>
        <p>
          Le site Taylor&apos;s Secret Garden (www.taylorssecretgarden.com) est édité à titre non professionnel par{" "}
          <strong>{siteConfig.publisher}</strong>, particulier, qui en est aussi le directeur de la publication.
        </p>
        <p>
          Conformément à l&apos;article 6, III, 2 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique
          (LCEN), l&apos;éditeur, personne physique éditant le site à titre non professionnel, ne rend pas publics son adresse et son numéro
          de téléphone : il les a communiqués à l&apos;hébergeur.
        </p>
        <h3>Contact</h3>
        <p>
          Par courriel : <ContactEmail />.
        </p>
        <h3>Hébergeur</h3>
        <HostAddress country="États-Unis" />
        <h3>Propriété intellectuelle</h3>
        <p>
          Taylor&apos;s Secret Garden est un site de fan non officiel, sans lien avec Taylor Swift, son équipe ou ses maisons de disques, et
          non approuvé par eux. Les noms, titres, pochettes, photographies et enregistrements cités ou montrés appartiennent à leurs titulaires
          respectifs.
        </p>
        <p>
          Les pochettes d&apos;albums, les listes de titres et les extraits de 30 secondes sont fournis par{" "}
          <a href="https://www.deezer.com/">Deezer</a>, au moyen de son interface publique. Les photographies sont créditées lorsque leur
          auteur est connu. Tout titulaire de droits qui souhaite le retrait d&apos;un contenu ou la correction d&apos;un crédit peut écrire à{" "}
          <ContactEmail /> : le contenu sera retiré ou corrigé dans les meilleurs délais.
        </p>
        <p>
          Les textes et le code du site sont de {siteConfig.publisher} ; le code source est publié sur <a href={REPOSITORY}>GitHub</a> sous
          licence MIT.
        </p>
        <h3>Contenus publiés par les membres</h3>
        <p>
          Les notes publiées sur Swiftter le sont par leurs auteurs, sous leur responsabilité, dans le respect des{" "}
          <Link href="/terms">conditions d&apos;utilisation</Link> (en anglais). Pour signaler un contenu illicite, utilisez le bouton
          « Report » présent sur chaque note, ou écrivez à <ContactEmail />.
        </p>
        <h3>Données personnelles et cookies</h3>
        <p>
          Voir la <Link href="/privacy">politique de confidentialité</Link> (en anglais). Le site n&apos;utilise que les cookies strictement
          nécessaires à la connexion des membres. Vous pouvez adresser une réclamation à la{" "}
          <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>.
        </p>
      </Section>

      <Section id="en" title="In English">
        <h3>Publisher and publication director</h3>
        <p>
          Taylor&apos;s Secret Garden (www.taylorssecretgarden.com) is published on a non-professional basis by{" "}
          <strong>{siteConfig.publisher}</strong>, a private individual, who is also its publication director.
        </p>
        <p>
          As French law allows a private individual publishing on a non-professional basis (LCEN, art. 6-III-2), his home address and phone
          number are not published: he has given them to the host.
        </p>
        <h3>Contact</h3>
        <p>
          By email: <ContactEmail />.
        </p>
        <h3>Host</h3>
        <HostAddress country="United States" />
        <h3>Intellectual property</h3>
        <p>
          Taylor&apos;s Secret Garden is an unofficial fan site, not affiliated with, nor endorsed by, Taylor Swift, her team or her labels. The
          names, titles, album covers, photographs and recordings mentioned or shown belong to their respective owners.
        </p>
        <p>
          Album covers, tracklists and 30-second previews come from <a href="https://www.deezer.com/">Deezer</a>, through its public API.
          Photographs are credited where their author is known. Any rights holder who wants something removed or a credit corrected can write
          to <ContactEmail />: it will be removed or corrected promptly.
        </p>
        <p>
          The site&apos;s text and code are by {siteConfig.publisher}; the source code is published on <a href={REPOSITORY}>GitHub</a> under
          the MIT licence.
        </p>
        <h3>What Members publish</h3>
        <p>
          Notes on Swiftter are published by their authors, who are responsible for them, under the <Link href="/terms">terms</Link>. To
          report unlawful content, use the &ldquo;Report&rdquo; button on each note, or write to <ContactEmail />.
        </p>
        <h3>Personal data and cookies</h3>
        <p>
          See the <Link href="/privacy">privacy policy</Link>. The site uses only the cookies Members need to sign in. You can complain to the
          French data protection authority, the <a href="https://www.cnil.fr/fr/plaintes">CNIL</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
