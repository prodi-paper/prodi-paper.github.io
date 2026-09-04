/* ═══ Cotations Fret — données FICTIVES (prototype) ═══ */

const ZONES = {
  maghreb: 'Maghreb',
  afrique_ouest: "Afrique de l'Ouest",
  europe: 'Europe',
  monde: 'Monde entier',
};

const TRANSPORTEURS = [
  { id: 'translog',  nom: 'Translog Med',        contact: 'Karim',    email: 'k.bensaid@translogmed.example',   zones: ['maghreb'],                 couleur: '#e01414' },
  { id: 'atlas',     nom: 'Atlas Freight',       contact: 'Sofia',    email: 'sofia@atlasfreight.example',      zones: ['maghreb'],                 couleur: '#b7791f' },
  { id: 'seafret',   nom: 'Seafret Atlantique',  contact: 'Marc',     email: 'm.leroy@seafret.example',         zones: ['maghreb', 'afrique_ouest'], couleur: '#0a7d33' },
  { id: 'capouest',  nom: 'CapOuest Shipping',   contact: 'Awa',      email: 'awa@capouest.example',            zones: ['afrique_ouest'],           couleur: '#7c3aed' },
  { id: 'bernardi',  nom: 'Groupe Bernardi',     contact: 'Luca',     email: 'l.bernardi@bernardi.example',     zones: ['europe'],                  couleur: '#0369a1' },
  { id: 'eurocargo', nom: 'EuroCargo Express',   contact: 'Petra',    email: 'petra@eurocargo.example',         zones: ['europe'],                  couleur: '#be185d' },
  { id: 'mtl',       nom: 'MTL Overseas',        contact: 'David',    email: 'd.cohen@mtloverseas.example',     zones: ['monde'],                   couleur: '#334155' },
  { id: 'globalwave',nom: 'Global Wave Logistics', contact: 'Yusuf',  email: 'yusuf@globalwave.example',        zones: ['monde'],                   couleur: '#ea580c' },
];

const PAYS = [
  { code: 'MA', nom: 'Maroc',          flag: '🇲🇦', zone: 'maghreb',        port: 'Casablanca' },
  { code: 'DZ', nom: 'Algérie',        flag: '🇩🇿', zone: 'maghreb',        port: 'Alger' },
  { code: 'TN', nom: 'Tunisie',        flag: '🇹🇳', zone: 'maghreb',        port: 'Radès' },
  { code: 'SN', nom: 'Sénégal',        flag: '🇸🇳', zone: 'afrique_ouest',  port: 'Dakar' },
  { code: 'CI', nom: "Côte d'Ivoire",  flag: '🇨🇮', zone: 'afrique_ouest',  port: 'Abidjan' },
  { code: 'GH', nom: 'Ghana',          flag: '🇬🇭', zone: 'afrique_ouest',  port: 'Tema' },
  { code: 'NG', nom: 'Nigeria',        flag: '🇳🇬', zone: 'afrique_ouest',  port: 'Lagos (Apapa)' },
  { code: 'CM', nom: 'Cameroun',       flag: '🇨🇲', zone: 'afrique_ouest',  port: 'Douala' },
  { code: 'GN', nom: 'Guinée',         flag: '🇬🇳', zone: 'afrique_ouest',  port: 'Conakry' },
  { code: 'TG', nom: 'Togo',           flag: '🇹🇬', zone: 'afrique_ouest',  port: 'Lomé' },
  { code: 'ES', nom: 'Espagne',        flag: '🇪🇸', zone: 'europe',         port: 'Valence' },
  { code: 'PT', nom: 'Portugal',       flag: '🇵🇹', zone: 'europe',         port: 'Leixões' },
  { code: 'IT', nom: 'Italie',         flag: '🇮🇹', zone: 'europe',         port: 'Gênes' },
  { code: 'DE', nom: 'Allemagne',      flag: '🇩🇪', zone: 'europe',         port: 'Hambourg' },
  { code: 'PL', nom: 'Pologne',        flag: '🇵🇱', zone: 'europe',         port: 'Gdańsk' },
  { code: 'RO', nom: 'Roumanie',       flag: '🇷🇴', zone: 'europe',         port: 'Constanța' },
  { code: 'GR', nom: 'Grèce',          flag: '🇬🇷', zone: 'europe',         port: 'Le Pirée' },
  { code: 'TR', nom: 'Turquie',        flag: '🇹🇷', zone: 'monde',          port: 'Istanbul (Ambarlı)' },
  { code: 'EG', nom: 'Égypte',         flag: '🇪🇬', zone: 'monde',          port: 'Alexandrie' },
  { code: 'LB', nom: 'Liban',          flag: '🇱🇧', zone: 'monde',          port: 'Beyrouth' },
  { code: 'AE', nom: 'Émirats',        flag: '🇦🇪', zone: 'monde',          port: 'Jebel Ali' },
  { code: 'IN', nom: 'Inde',           flag: '🇮🇳', zone: 'monde',          port: 'Nhava Sheva' },
];

/* prix de référence fictifs par pays (€ / container 20') pour la simulation */
const PRIX_BASE = {
  MA: 880, DZ: 1010, TN: 940, SN: 1420, CI: 1510, GH: 1580, NG: 1720, CM: 1650,
  GN: 1560, TG: 1540, ES: 620, PT: 680, IT: 710, DE: 760, PL: 830, RO: 950,
  GR: 900, TR: 1050, EG: 1150, LB: 1250, AE: 1500, IN: 1650,
};

const CC_INTERNE = ['julien@prodi.com', 'info@prodi.com'];

/* ── Demandes passées (fictives) ── */
const DEMANDES = [
  {
    ref: 'FR-2601', pays: 'MA', tonnage: 22, detail: 'Bobines de papier, 1 container 20\'',
    incoterm: 'CFR', date: '2026-08-12T09:14:00', cibles: ['translog', 'atlas', 'seafret', 'mtl', 'globalwave'],
  },
  {
    ref: 'FR-2602', pays: 'TR', tonnage: 44, detail: 'Bobines couché C1S, 2 containers 20\'',
    incoterm: 'CFR', date: '2026-08-19T15:40:00', cibles: ['mtl', 'globalwave'],
  },
  {
    ref: 'FR-2603', pays: 'SN', tonnage: 24, detail: 'Papier en bobines, 1 container 20\'',
    incoterm: 'CFR', date: '2026-08-25T10:05:00', cibles: ['seafret', 'capouest', 'mtl', 'globalwave'],
  },
  {
    ref: 'FR-2604', pays: 'MA', tonnage: 46, detail: 'Bobines de papier, 2 containers 20\'',
    incoterm: 'CFR', date: '2026-08-31T11:30:00', cibles: ['translog', 'atlas', 'seafret', 'mtl', 'globalwave'],
  },
];

/* ── Réponses reçues (fictives) — prix en € ── */
const REPONSES = [
  /* FR-2601 · Maroc · 12/08 */
  { demande: 'FR-2601', transporteur: 'translog',  prix: 870,  unite: '20', incoterm: 'CFR', transit: '4-5 j',  recu: '2026-08-12T11:02:00',
    texte: "Bonjour Ethan,\n\nPour Casablanca on vous fait 870 € le 20' CFR, transit 4/5 jours, départ Marseille chaque jeudi.\nValidité 15 jours.\n\nCordialement,\nKarim" },
  { demande: 'FR-2601', transporteur: 'atlas',     prix: 905,  unite: '20', incoterm: 'CFR', transit: '5 j',    recu: '2026-08-12T14:37:00',
    texte: "Bonjour,\n\nNotre meilleure offre : 905 EUR / TC20 CFR Casa, transit 5 jours.\n\nBien à vous,\nSofia" },
  { demande: 'FR-2601', transporteur: 'seafret',   prix: 890,  unite: '20', incoterm: 'CFR', transit: '6 j',    recu: '2026-08-13T09:20:00',
    texte: "Bonjour,\n\n890 € le container 20 pieds CFR Casablanca, départ Le Havre, transit 6 jours.\n\nMarc" },
  { demande: 'FR-2601', transporteur: 'mtl',       prix: 980,  unite: '20', incoterm: 'CFR', transit: '5 j',    recu: '2026-08-14T16:55:00',
    texte: "Hello,\n\nOn est à 980 € TC20 CFR Casa en ce moment, marché tendu.\n\nDavid" },
  /* globalwave n'a pas répondu à FR-2601 */

  /* FR-2602 · Turquie · 19/08 */
  { demande: 'FR-2602', transporteur: 'mtl',       prix: 1040, unite: '20', incoterm: 'CFR', transit: '9 j',    recu: '2026-08-20T10:12:00',
    texte: "Bonjour Ethan,\n\nAmbarlı : 1 040 € par 20' CFR, transit 9 jours via Le Pirée.\n\nDavid" },
  { demande: 'FR-2602', transporteur: 'globalwave', prix: null, unite: null, incoterm: null,  transit: null,     recu: '2026-08-21T09:00:00', flagged: true,
    texte: "Bonjour,\n\nÇa dépend de la semaine de départ, comptez entre 45 et 52 la tonne selon le navire. Rappelez-moi pour caler ça.\n\nYusuf" },

  /* FR-2603 · Sénégal · 25/08 */
  { demande: 'FR-2603', transporteur: 'capouest',  prix: 1390, unite: '20', incoterm: 'CFR', transit: '11 j',   recu: '2026-08-25T13:44:00',
    texte: "Bonjour,\n\nDakar : 1 390 € le TC20 CFR, transit 11 jours, départ Anvers.\n\nAwa" },
  { demande: 'FR-2603', transporteur: 'seafret',   prix: 1445, unite: '20', incoterm: 'CFR', transit: '10 j',   recu: '2026-08-26T08:15:00',
    texte: "Bonjour,\n\n1 445 € / 20' CFR Dakar, transit 10 jours.\n\nMarc" },
  { demande: 'FR-2603', transporteur: 'mtl',       prix: 1520, unite: '20', incoterm: 'CFR', transit: '12 j',   recu: '2026-08-27T17:30:00',
    texte: "Bonjour,\n\nOn est à 1 520 € le 20 pieds sur Dakar CFR.\n\nDavid" },
  /* globalwave n'a pas répondu à FR-2603 */

  /* FR-2604 · Maroc · 31/08 */
  { demande: 'FR-2604', transporteur: 'translog',  prix: 860,  unite: '20', incoterm: 'CFR', transit: '4-5 j',  recu: '2026-08-31T14:20:00',
    texte: "Bonjour Ethan,\n\nToujours ok sur Casa : 860 € le 20' CFR pour 2 boîtes, transit 4/5 jours.\n\nKarim" },
  { demande: 'FR-2604', transporteur: 'seafret',   prix: 875,  unite: '20', incoterm: 'CFR', transit: '6 j',    recu: '2026-09-01T09:48:00',
    texte: "Bonjour,\n\n875 € par container CFR Casablanca sur cette période.\n\nMarc" },
  { demande: 'FR-2604', transporteur: 'atlas',     prix: 915,  unite: '20', incoterm: 'CFR', transit: '5 j',    recu: '2026-09-01T18:05:00',
    texte: "Bonjour,\n\n915 EUR / TC20 CFR Casa. Possibilité -10 € si 4 boîtes ou plus.\n\nSofia" },

  /* ── historique plus ancien pour nourrir les courbes ── */
  { demande: 'FR-2588', transporteur: 'translog',  prix: 910,  unite: '20', incoterm: 'CFR', transit: '5 j',  recu: '2026-06-18T10:00:00', pays: 'MA',
    texte: "910 € le 20' CFR Casablanca.\n\nKarim" },
  { demande: 'FR-2588', transporteur: 'atlas',     prix: 940,  unite: '20', incoterm: 'CFR', transit: '5 j',  recu: '2026-06-18T15:00:00', pays: 'MA',
    texte: "940 EUR / TC20 CFR Casa.\n\nSofia" },
  { demande: 'FR-2588', transporteur: 'mtl',       prix: 1010, unite: '20', incoterm: 'CFR', transit: '5 j',  recu: '2026-06-19T11:00:00', pays: 'MA',
    texte: "1 010 € TC20 CFR Casa.\n\nDavid" },
  { demande: 'FR-2592', transporteur: 'translog',  prix: 895,  unite: '20', incoterm: 'CFR', transit: '5 j',  recu: '2026-07-10T09:30:00', pays: 'MA',
    texte: "895 € le 20' CFR Casa.\n\nKarim" },
  { demande: 'FR-2592', transporteur: 'seafret',   prix: 900,  unite: '20', incoterm: 'CFR', transit: '6 j',  recu: '2026-07-10T14:10:00', pays: 'MA',
    texte: "900 € / 20' CFR Casablanca.\n\nMarc" },
  { demande: 'FR-2592', transporteur: 'atlas',     prix: 925,  unite: '20', incoterm: 'CFR', transit: '5 j',  recu: '2026-07-11T10:45:00', pays: 'MA',
    texte: "925 EUR TC20 CFR Casa.\n\nSofia" },
  { demande: 'FR-2595', transporteur: 'capouest',  prix: 1440, unite: '20', incoterm: 'CFR', transit: '11 j', recu: '2026-07-22T11:00:00', pays: 'SN',
    texte: "1 440 € TC20 CFR Dakar.\n\nAwa" },
  { demande: 'FR-2595', transporteur: 'seafret',   prix: 1480, unite: '20', incoterm: 'CFR', transit: '10 j', recu: '2026-07-22T16:20:00', pays: 'SN',
    texte: "1 480 € / 20' CFR Dakar.\n\nMarc" },
  { demande: 'FR-2597', transporteur: 'mtl',       prix: 1085, unite: '20', incoterm: 'CFR', transit: '9 j',  recu: '2026-07-28T10:00:00', pays: 'TR',
    texte: "1 085 € TC20 CFR Ambarlı.\n\nDavid" },
  { demande: 'FR-2597', transporteur: 'globalwave', prix: 1120, unite: '20', incoterm: 'CFR', transit: '10 j', recu: '2026-07-28T18:40:00', pays: 'TR',
    texte: "1 120 € le 20 pieds CFR Istanbul.\n\nYusuf" },
];

/* pays des vieilles demandes hors DEMANDES (pour l'historique) */
const DEMANDES_ARCHIVE = {
  'FR-2588': { pays: 'MA', date: '2026-06-18T08:30:00' },
  'FR-2592': { pays: 'MA', date: '2026-07-10T08:00:00' },
  'FR-2595': { pays: 'SN', date: '2026-07-22T09:15:00' },
  'FR-2597': { pays: 'TR', date: '2026-07-28T08:45:00' },
};
