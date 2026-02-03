/* ==================================================
@@@→ LISTE DES FONCTIONS, EVENTS ET LEUR UTILITÉ
==================================================

✔ CONFIGURATION & DONNÉES
-------------------------
API_KEY / API_URL
→ Configuration d’accès à l’API Gemini (clé + endpoint)

TENUES (constante)
→ Liste complète des tenues disponibles
→ Contient : nom, vêtements, images, mots-clés et conditions météo idéales

tenuesSimplifiees (constante)
→ Version allégée de TENUES destinée à l’API Gemini
→ Réduit le volume de données envoyées tout en conservant l’essentiel


✔ GEMINI API (IA)
-----------------
askGemini(prompt, retries, delay)
→ Envoie une requête à l’API Gemini pour générer une tenue adaptée
→ Gère automatiquement les erreurs 503 (serveur saturé)
→ Implémente un système de retry avec délai progressif

buildPrompt(meteo, occasions)
→ Construit le prompt textuel envoyé à Gemini
→ Combine météo, température, occasions et tenues disponibles
→ Impose un format de réponse HTML strict exploitable côté UI


✔ MÉTÉO
--------
getMeteoCompiegne()
→ Récupère la météo actuelle de Compiègne via l’API Open-Meteo
→ Retourne un objet { temperature, weathercode }

traduireWeatherCode(code)
→ Convertit un code météo numérique en texte lisible
→ Exemples : 0 → "Ciel clair", 61 → "Pluie"

afficherMeteo()
→ Affiche la température et la description météo dans l’interface
→ Gère les erreurs d’API avec un affichage de secours


✔ AFFICHAGE UI
---------------
afficherToutesLesTenues()
→ Affiche tous les vêtements disponibles par catégorie
→ Sépare vêtements / accessoires / chaussures
→ Évite les doublons grâce à un Set()

injecterTenueDansUI(html)
→ Injecte le HTML généré par Gemini dans l’interface
→ Extrait :
   • image principale de la tenue
   • liste détaillée des vêtements
→ Met à jour les zones d’aperçu et de détails


✔ INTERACTIONS UTILISATEUR
--------------------------
getOccasionsSelectionnees()
→ Récupère les occasions sélectionnées par l’utilisateur
→ Se base sur les cartes ayant la classe "active"
→ Retourne un tableau de valeurs data-occasion

setupActiveToggle(containerId, selector, multiple)
→ Gère la sélection des cartes cliquables
→ Mode sélection unique ou multiple
→ Ajoute / retire dynamiquement la classe "active"

Listener "valid-occasion" (click)
→ Déclenche la génération d’une tenue via Gemini
→ Enchaîne :
   • récupération météo
   • récupération occasions
   • génération du prompt
   • appel Gemini
   • affichage du résultat
→ Gère l’état de chargement, les erreurs et la désactivation du bouton


✔ MENU & NAVIGATION
-------------------
openCloseMenu(btn)
→ Ouvre / ferme le menu burger
→ Gère l’animation du bouton et l’affichage du menu


✔ SCROLL & CARROUSELS
---------------------
enableHorizontalScroll(selector)
→ Active le scroll horizontal à la molette
→ Transforme le scroll vertical en déplacement horizontal

enableDragScroll(selector)
→ Active le scroll horizontal par cliquer-glisser (drag)
→ Améliore l’ergonomie des carrousels


✔ AJOUT DE VÊTEMENT
-------------------
afficherPopupSucces()
→ Affiche une popup animée de confirmation
→ Se ferme automatiquement après 3 secondes

reinitialiserFormulaireVetement()
→ Réinitialise le formulaire d’ajout de vêtement
→ Vide le champ texte et supprime les sélections actives

Listener "bouton-enregistre" (click)
→ Vérifie la saisie utilisateur (nom + catégorie)
→ Affiche la popup de succès
→ Réinitialise le formulaire


✔ INITIALISATION
----------------
Initialisation des systèmes de sélection (catégories, occasions)
Initialisation de l’affichage des tenues
Initialisation de la météo au chargement
Adaptation responsive desktop
Activation des scrolls horizontaux

==================================================
*/

/* ==================================================
@@@ PAGE DE CHARGEMENT : ANIMATION + REDIRECTION
================================================== */

const loader = document.getElementById("loader");

if (loader) {

    const loadingTime = 3000;                                       // 3000 ms = 3 secondes

    // Lance l'animation de disparition (fade-out)
    setTimeout(() => {
        loader.classList.add("fade-out");                         // Ajoute la classe CSS qui déclenche l'animation
    }, loadingTime - 800);                                        // 800 ms avant la fin du chargement

    // Redirige automatiquement vers la page principale
    // Cette redirection se fait une fois l'animation terminée
    setTimeout(() => {
        window.location.href = "main.html";                       // Changement de page
    }, loadingTime);
}

/* ==================================================
@@@CONFIGURATION & API
    ==================================================*/
/*
Documentation Gemini API et clé :
https://aistudio.google.com/api-keys
https://ai.google.dev/gemini-api/docs?hl=fr#rest
*/

const API_KEY = "";                                                      // Clé pour accéder à l'API Gemini AIzaSyCjQYbfOKF-gvv0OcWb6iBlYNSmg4q3L74
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";     // URL de l'API Gemini pour générer du contenu

/* ==================================================
@@@DATA : LISTE DES TENUES DISPONIBLES
    ==================================================*/
// Tableau d'objets décrivant toutes les tenues avec leurs vêtements, images, mots-clés et conditions météo idéales.
const TENUES = [
    {
        nom: "Urban Nomad",                                                                                      // Nom de la tenue
        vetements: [                                                                                             // Liste des vêtements composant cette tenue
            { nom: "hoodie beige", imgUrl: "assets/img/tenues/vetements/hoodie_beige_street.jpg" },             // Chaque vêtement a un nom et une image
            { nom: "cargo noir", imgUrl: "assets/img/tenues/vetements/cargo_noir_large.jpg" },
            { nom: "baskets blanches", imgUrl: "assets/img/tenues/chaussures/baskets_blanches_cuir.jpg" },
            { nom: "casquette", imgUrl: "assets/img/tenues/accessoires/casquette_logo.jpg" }
        ],
        img: "assets/img/tenues/urban_nomad.jpg",                                                                // Image de la tenue complète
        keywords: ["street", "confort", "décontracté", "urbain", "mi-saison"],                                  // Mots-clés pour décrire le style de la tenue
        conditionsIdeales: ["nuageux", "sec", "vent léger", "couvert"]                                           // Conditions météo où cette tenue est idéale
    },
    {
        nom: "Le Dirigeant",
        vetements: [
            { nom: "chemise blanche", imgUrl: "assets/img/tenues/vetements/chemise_blanche_cintree.jpg" },
            { nom: "pantalon à pinces", imgUrl: "assets/img/tenues/vetements/pantalon_pinces_gris.jpg" },
            { nom: "mocassins", imgUrl: "assets/img/tenues/chaussures/mocassins_cuir.jpg" },
            { nom: "montre", imgUrl: "assets/img/tenues/accessoires/montre_automatique.jpg" },
            { nom: "veste de costume", imgUrl: "assets/img/tenues/vetements/veste_costume.jpg" }
        ],
        img: "assets/img/tenues/le_dirigeant.jpg",
        keywords: ["professionnel", "élégant", "propre", "bureau"],
        conditionsIdeales: ["sec", "intérieur", "couvert", "nuageux"]
    },
    {
        nom: "Piste d'Athlète",
        vetements: [
            { nom: "t-shirt respirant", imgUrl: "assets/img/tenues/vetements/tshirt_sport_mesh.jpg" },
            { nom: "short sport", imgUrl: "assets/img/tenues/vetements/short_sport_moulant.jpg" },
            { nom: "chaussures running", imgUrl: "assets/img/tenues/chaussures/running_performance.jpg" }
        ],
        img: "assets/img/tenues/piste_athlete.jpg",
        keywords: ["sport", "running", "performance", "chaud"],
        conditionsIdeales: ["sec", "ensoleillé", "doux", "chaud"]
    },
    {
        nom: "Campus Cool",
        vetements: [
            { nom: "t-shirt graphique", imgUrl: "assets/img/tenues/vetements/tshirt_graphique_retro.jpg" },
            { nom: "jean bleu", imgUrl: "assets/img/tenues/vetements/jean_bleu_regular.jpg" },
            { nom: "sneakers", imgUrl: "assets/img/tenues/chaussures/sneakers_toile.jpg" },
            { nom: "sac à dos", imgUrl: "assets/img/tenues/accessoires/sac_a_dos_toile.jpg" }
        ],
        img: "assets/img/tenues/campus_cool.jpg",
        keywords: ["cours", "étudiant", "confort", "mi-saison"],
        conditionsIdeales: ["nuageux", "sec", "doux"]
    },
    {
        nom: "Cyber Sobriété",
        vetements: [
            { nom: "sweat gris clair", imgUrl: "assets/img/tenues/vetements/sweat_gris_uni.jpg" },
            { nom: "cargo noir", imgUrl: "assets/img/tenues/vetements/cargo_noir_large.jpg" },
            { nom: "basket sobres", imgUrl: "assets/img/tenues/chaussures/basket_minimaliste_grise.jpg" },
            { nom: "sacoche", imgUrl: "assets/img/tenues/accessoires/sacoche_bandouliere.jpg" }
        ],
        img: "assets/img/tenues/cyber_sobriete.jpg",
        keywords: ["minimaliste", "sobre", "moderne", "mi-saison"],
        conditionsIdeales: ["nuageux", "sec", "couvert"]
    },
    {
        nom: "Nuit Noire",
        vetements: [
            { nom: "chemise noire", imgUrl: "assets/img/tenues/vetements/chemise_noire_soie.jpg" },
            { nom: "pantalon noir", imgUrl: "assets/img/tenues/vetements/pantalon_noir.jpg" },
            { nom: "mocassins", imgUrl: "assets/img/tenues/chaussures/mocassins_cuir.jpg" },
            { nom: "bracelet", imgUrl: "assets/img/tenues/accessoires/bracelet_metal.jpg" }
        ],
        img: "assets/img/tenues/nuit_noire.jpg",
        keywords: ["soirée", "chic", "classe", "frais"],
        conditionsIdeales: ["sec", "doux"]
    },
    {
        nom: "Refuge Cosy",
        vetements: [
            { nom: "pull doux", imgUrl: "assets/img/tenues/vetements/pull_laine_epais.jpg" },
            { nom: "jogging", imgUrl: "assets/img/tenues/vetements/jogging_coton.jpg" },
            { nom: "chaussettes épaisses", imgUrl: "assets/img/tenues/accessoires/chaussettes_laine.jpg" }
        ],
        img: "assets/img/tenues/refuge_cosy.jpg",
        keywords: ["relax", "détente", "confort", "frais", "intérieur"],
        conditionsIdeales: ["froid", "intérieur", "pluie", "neige"]
    },
    {
        nom: "Sentier Robuste",
        vetements: [
            { nom: "chemise flanelle", imgUrl: "assets/img/tenues/vetements/chemise_flanelle.jpg" },
            { nom: "jean brut", imgUrl: "assets/img/tenues/vetements/jean_brut.jpg" },
            { nom: "boots robustes", imgUrl: "assets/img/tenues/chaussures/boostes_robustes.jpg" },
            { nom: "veste épaisse", imgUrl: "assets/img/tenues/vetements/veste_epaisse.jpg" }
        ],
        img: "assets/img/tenues/sentier_robuste.jpg",
        keywords: ["travail", "extérieur", "résistant", "frais", "automne"],
        conditionsIdeales: ["vent", "légèrement humide", "brumeux", "froid"]
    },
    {
        nom: "Riviera Détente",
        vetements: [
            { nom: "short léger", imgUrl: "assets/img/tenues/vetements/short_lin_beige.jpg" },
            { nom: "débardeur", imgUrl: "assets/img/tenues/vetements/debardeur_blanc_coton.jpg" },
            { nom: "claquettes", imgUrl: "assets/img/tenues/chaussures/claquettes_caoutchouc.jpg" },
            { nom: "lunettes de soleil", imgUrl: "assets/img/tenues/accessoires/lunettes_soleil_aviateur.jpg" }
        ],
        img: "assets/img/tenues/riviera_detente.jpg",
        keywords: ["été", "plage", "chaud", "vacances"],
        conditionsIdeales: ["soleil", "chaleur", "très chaud"]
    },
    {
        nom: "Antipluie Tactique",
        vetements: [
            { nom: "imperméable", imgUrl: "assets/img/tenues/vetements/impermeable_jaune.jpg" },
            { nom: "jean sombre", imgUrl: "assets/img/tenues/vetements/jean_sombre_slim.jpg" },
            { nom: "chaussures waterproof", imgUrl: "assets/img/tenues/chaussures/chaussures_waterproof_ville.jpg" }
        ],
        img: "assets/img/tenues/antipluie_tactique.jpg",
        keywords: ["pluie", "urbain", "pratique", "frais"],
        conditionsIdeales: ["pluie", "averses", "humide", "vent fort"]
    },
    {
        nom: "Glace & Laine",
        vetements: [
            { nom: "manteau long", imgUrl: "assets/img/tenues/vetements/manteau_laine_gris_long.jpg" },
            { nom: "écharpe laine", imgUrl: "assets/img/tenues/accessoires/echarpe_laine_marine.jpg" },
            { nom: "pantalon chaud", imgUrl: "assets/img/tenues/vetements/pantalon_laine_chaud.jpg" },
            { nom: "bottes élégantes", imgUrl: "assets/img/tenues/chaussures/bottes_cuir_montantes.jpg" },
            { nom: "gants", imgUrl: "assets/img/tenues/accessoires/gants_cuir.jpg" }
        ],
        img: "assets/img/tenues/glace_laine.jpg",
        keywords: ["froid", "hiver", "élégant", "classe"],
        conditionsIdeales: ["neige", "très froid", "gel", "froid sec"]
    },
    {
        nom: "Flashback Rétro",
        vetements: [
            { nom: "veste en jean", imgUrl: "assets/img/tenues/vetements/veste_jean_decoloree.jpg" },
            { nom: "t-shirt rétro", imgUrl: "assets/img/tenues/vetements/tshirt_retro_logo.jpg" },
            { nom: "pantalon large", imgUrl: "assets/img/tenues/vetements/pantalon_large_velours.jpg" },
            { nom: "bandana", imgUrl: "assets/img/tenues/accessoires/bandana_rouge.jpg" }
        ],
        img: "assets/img/tenues/flashback_retro.jpg",
        keywords: ["vintage", "rétro", "coloré", "mi-saison"],
        conditionsIdeales: ["sec", "ensoleillé", "doux"]
    },
    {
        nom: "Décontracté Raffiné",
        vetements: [
            { nom: "polo", imgUrl: "assets/img/tenues/vetements/polo_pique_vert.jpg" },
            { nom: "chino", imgUrl: "assets/img/tenues/vetements/chino_beige.jpg" },
            { nom: "derbies", imgUrl: "assets/img/tenues/chaussures/derbies_daim.jpg" }
        ],
        img: "assets/img/tenues/decontracte_raffined.jpg",
        keywords: ["pro", "stylé", "léger", "bureau décontracté"],
        conditionsIdeales: ["ensoleillé", "sec", "doux"]
    },
    {
        nom: "Maître des Couleurs",
        vetements: [
            { nom: "chemise oversize", imgUrl: "assets/img/tenues/vetements/chemise_oversize_imprimee.jpg" },
            { nom: "pantalon noir", imgUrl: "assets/img/tenues/vetements/pantalon_noir.jpg" },
            { nom: "basket colorées", imgUrl: "assets/img/tenues/chaussures/basket_multicolore.jpg" }
        ],
        img: "assets/img/tenues/maitre_des_couleurs.jpg",
        keywords: ["créatif", "artistique", "original", "été"],
        conditionsIdeales: ["sec", "doux", "chaud"]
    },
    {
        nom: "Épure Bicolore",
        vetements: [
            { nom: "tshirt blanc", imgUrl: "assets/img/tenues/vetements/tshirt_blanc_luxe.jpg" },
            { nom: "pantalon noir", imgUrl: "assets/img/tenues/vetements/pantalon_noir.jpg" },
            { nom: "basket sobres", imgUrl: "assets/img/tenues/chaussures/basket_minimaliste_grise.jpg" }
        ],
        img: "assets/img/tenues/epure_bicolore.jpg",
        keywords: ["minimal", "clean", "moderne", "mi-saison"],
        conditionsIdeales: ["nuageux", "sec", "doux"]
    },
    {
        nom: "Endurance Hivernale",
        vetements: [
            { nom: "legging thermique", imgUrl: "assets/img/tenues/vetements/legging_thermique.jpg" },
            { nom: "coupe-vent", imgUrl: "assets/img/tenues/vetements/coupe_vent_respirant.jpg" },
            { nom: "gants", imgUrl: "assets/img/tenues/accessoires/gants_tactiles.jpg" },
            { nom: "bonnet de sport", imgUrl: "assets/img/tenues/accessoires/bonnet_hiver_sport.jpg" }
        ],
        img: "assets/img/tenues/endurance_hivernale.jpg",
        keywords: ["sport", "froid", "couverture", "running hiver"],
        conditionsIdeales: ["froid", "vent", "sec", "couvert"]
    },
    {
        nom: "Séance Télétravail",
        vetements: [
            { nom: "pantalon en laine fin", imgUrl: "assets/img/tenues/vetements/pantalon_laine_confort.jpg" },
            { nom: "cardigan cachemire", imgUrl: "assets/img/tenues/vetements/cardigan_cachemire_bleu.jpg" },
            { nom: "chaussons de cuir", imgUrl: "assets/img/tenues/chaussures/chaussons_cuir_doux.jpg" }
        ],
        img: "assets/img/tenues/seance_teletravail.jpg",
        keywords: ["intérieur", "télétravail", "élégant", "confort"],
        conditionsIdeales: ["intérieur"]
    }
];

/* ==================================================
@@@GEMINI : APPEL API AVEC RETRY AUTOMATIQUE
    ==================================================*/
// Fonction pour appeler l'API Gemini avec gestion des erreurs 503 (service saturé)
// MDN fetch: https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch
// MDN async/await: https://developer.mozilla.org/fr/docs/Learn/JavaScript/Asynchronous/Promises
async function askGemini(prompt, retries = 3, delay = 1500) {
    try {
        const response = await fetch(API_URL, {                                                                  // fetch() fait une requête HTTP vers l'API (comme un formulaire qui envoie des données)
            method: "POST",                                                                                      // POST = envoyer des données au serveur (contrairement à GET qui récupère)
            headers: {                                                                                           // headers = informations sur la requête
                "Content-Type": "application/json",                                                              // On précise qu'on envoie du JSON (format de données structuré)
                "x-goog-api-key": API_KEY                                                                        // Clé d'authentification pour accéder à l'API
            },
            body: JSON.stringify({                                                                               // body = le contenu de la requête, JSON.stringify() convertit un objet JS en texte JSON
                contents: [{ parts: [{ text: prompt }] }]                                                        // Structure demandée par l'API Gemini : le prompt est le texte qu'on envoie à l'IA
            })
        });

        if (!response.ok) {                                                                                      // Si la requête a échoué (code d'erreur HTTP comme 404, 500, etc.)
            const text = await response.text();                                                                  // On récupère le message d'erreur du serveur
            throw new Error(`Gemini error ${response.status}: ${text}`);                                         // throw = lancer une erreur pour arrêter le code et aller dans le catch
        }

        const data = await response.json();                                                                      // .json() convertit la réponse (texte JSON) en objet JavaScript utilisable
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";                                            // ?. = "optional chaining", évite les erreurs si une propriété n'existe pas, retourne "" si vide

    } catch (err) {                                                                                              // catch attrape toutes les erreurs qui se produisent dans le try
        // Retry automatique si code 503 (service saturé)
        if (retries > 0 && err.message.includes("503")) {                                                        // Si il reste des tentatives ET que l'erreur est un code 503 (serveur surchargé)
            console.warn(`Gemini saturé → retry dans ${delay}ms...`);                                            // Affiche un avertissement dans la console du navigateur
            await new Promise(res => setTimeout(res, delay));                                                    // Attend X millisecondes avant de réessayer (Promise + setTimeout = pause asynchrone)
            return askGemini(prompt, retries - 1, delay * 2);                                                    // Rappelle la fonction avec 1 tentative en moins et double le délai d'attente
        }
        throw err;                                                                                               // Si plus de tentatives ou autre erreur, on relance l'erreur pour la gérer ailleurs
    }
}

/* ==================================================
@@@PROMPT GEMINI
    ==================================================*/
// Simplifie les données de tenues pour l'envoyer à Gemini
const tenuesSimplifiees = TENUES.map(t => ({                                                                     // .map() parcourt chaque tenue et crée un nouveau tableau simplifié
    nom: t.nom,                                                                                                    // On garde seulement les infos utiles pour l'IA
    keywords: t.keywords,
    conditionsIdeales: t.conditionsIdeales,
    img: t.img,
    vetements: t.vetements.map(v => ({                                                                             // On simplifie aussi les vêtements de chaque tenue
        nom: v.nom,
        imgUrl: v.imgUrl
    }))
}));

// Fonction pour créer le prompt envoyé à Gemini
function buildPrompt(meteo, occasions) {
    console.info(traduireWeatherCode(meteo.weathercode))                                                         // Affiche les infos dans la console pour débugger
    console.info(`${meteo.temperature}°C`)
    console.info(`${occasions.join(", ") || "Aucune précision"}`)                                                // .join(", ") transforme un tableau ["sport", "ville"] en texte "sport, ville"
    return `
        Tu es un styliste professionnel expert en mode et en adaptation de tenues aux contextes spécifiques.

        Voici la liste complète des tenues disponibles :
        ${JSON.stringify(tenuesSimplifiees)}

        INFORMATIONS UTILISATEUR
        - Météo actuelle : ${traduireWeatherCode(meteo.weathercode)}
        - Température : ${meteo.temperature}°C
        - Occasions sélectionnées : ${occasions.join(", ") || "Aucune précision"}

        OBJECTIF
        Analyse les ${JSON.stringify(tenuesSimplifiees)} pour sélectionner la **MEILLEURE** tenue selon les critères suivants :
        1. **Pertinence contextuelle (Critère Principal) :** La tenue doit avoir au moins un "keyword" qui correspond à l'une des "Occasions sélectionnées".
        2. **Adaptation Météo :** La tenue doit être appropriée à la "Météo actuelle" et à la "Température".
        3. **Sélection Finale :** Si plusieurs tenues correspondent, choisis celle dont les "conditionsIdeales" et les "keywords" sont les plus proches de l'ensemble des informations utilisateur.

        FORMAT DE RÉPONSE OBLIGATOIRE (HTML UNIQUEMENT) :

        <div class="tenue-result">
            <img class="img-tenue" src="IMAGE_TENUE">
            <h2>NOM_TENUE</h2>
            <div class="details">
                <div class="cart-detail">
                    <img src="IMAGE_VETEMENT">
                    <div class="info-detail">
                        <h4>NOM_VETEMENT</h4>
                        <p>DESCRIPTION COURTE</p>
                    </div>
                </div>
            </div>
        </div>

        Aucun texte hors HTML.
    `;                                                                                                           // Prompt envoyé à l'IA Gemini
}

/* ==================================================
@@@MÉTÉO
    ==================================================*/
// Fonction pour récupérer la météo de Compiègne
async function getMeteoCompiegne() {
    const lat = 49.41794;                                                                                        // Latitude de Compiègne (coordonnées GPS)
    const lon = 2.82606;                                                                                         // Longitude de Compiègne

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`; // URL de l'API météo avec les coordonnées
    const response = await fetch(url);                                                                           // Appel à l'API météo (même principe que pour Gemini)
    const data = await response.json();                                                                          // Conversion de la réponse en objet JavaScript

    return {                                                                                                     // On retourne un objet avec les données météo importantes
        temperature: data.current_weather.temperature,                                                           // Température actuelle
        weathercode: data.current_weather.weathercode                                                            // Code météo (ex : 0 = clair, 61 = pluie, etc.)
    };
}

// Fonction pour traduire le code météo en texte lisible
function traduireWeatherCode(code) {
    if (code === 0) return "Ciel clair";                                                                         // === vérifie une égalité stricte (type + valeur)
    if ([1, 2].includes(code)) return "Partiellement nuageux";                                                   // .includes() vérifie si le code est dans le tableau [1, 2]
    if (code === 3) return "Couvert";
    if ([45, 48].includes(code)) return "Brouillard";
    if ([51, 53, 55].includes(code)) return "Bruine";
    if ([61, 63, 65].includes(code)) return "Pluie";
    if ([71, 73, 75].includes(code)) return "Neige";
    if ([80, 81, 82].includes(code)) return "Averses";
    if (code === 95) return "Orage";
    return "Temps inconnu";                                                                                      // Si aucun code ne correspond, on retourne un texte par défaut
}

/* ==================================================
@@@UI : AFFICHAGE
    ==================================================*/
// Affiche la météo dans le DOM
async function afficherMeteo() {
    const degre = document.getElementById("degre");                                                              // Récupère l'élément HTML avec l'id "degre" (où afficher la température)
    const desc = document.getElementById("meteo-desc");                                                          // Élément où afficher la description ("Ciel clair", "Pluie", etc.)
    const apercu = document.getElementById("info-temp");                                                         // Élément pour afficher un aperçu de la température

    try {                                                                                                        // try/catch pour gérer les erreurs (si l'API météo ne répond pas par exemple)
        const meteo = await getMeteoCompiegne();                                                                 // Appel de la fonction qui récupère la météo
        degre.textContent = `${Math.round(meteo.temperature)}°C`;                                                // .textContent modifie le texte de l'élément HTML, Math.round() arrondit le nombre
        if (apercu) apercu.textContent = degre.textContent;                                                      // On copie le même texte dans l'aperçu (si l'élément existe)
        desc.textContent = traduireWeatherCode(meteo.weathercode);                                               // On traduit le code météo en texte lisible
    } catch {                                                                                                    // Si une erreur se produit (API ne répond pas, pas de connexion, etc.)
        degre.textContent = "—";                                                                                 // On affiche un tiret pour indiquer qu'on ne peut pas récupérer la météo
        desc.textContent = "Impossible de charger la météo";
    }
}

// Affiche toutes les tenues dans leurs catégories
function afficherToutesLesTenues() {
    const vetements = document.querySelector(".vetements");                                                      // .querySelector() récupère le PREMIER élément qui correspond au sélecteur CSS
    const accessoires = document.querySelector(".accessoires");
    const chaussures = document.querySelector(".chaussures");

    vetements.innerHTML = "";                                                                                    // .innerHTML = "" vide complètement le contenu de l'élément (reset)
    accessoires.innerHTML = "";
    chaussures.innerHTML = "";

    const dejaAffiche = new Set();                                                                               // Set() = collection d'éléments uniques (pas de doublons possibles)

    TENUES.forEach(tenue => {                                                                                    // .forEach() parcourt chaque tenue du tableau TENUES
        tenue.vetements.forEach(v => {                                                                           // Pour chaque tenue, on parcourt ses vêtements
            if (dejaAffiche.has(v.imgUrl)) return;                                                               // .has() vérifie si l'image est déjà dans le Set, return arrête cette itération
            dejaAffiche.add(v.imgUrl);                                                                           // .add() ajoute l'URL de l'image au Set pour éviter de l'afficher 2 fois

            const card = `
                <div class="card-vetement">
                    <img class="img-vet" src="${v.imgUrl}" alt="${v.nom}">
                    <h4>${v.nom}</h4>
                </div>
            `;                                                                                                   // On crée une carte HTML pour chaque vêtement

            if (v.imgUrl.includes("/vetements/")) vetements.innerHTML += card;                                   // .includes() vérifie si le texte contient "/vetements/"
            else if (v.imgUrl.includes("/accessoires/")) accessoires.innerHTML += card;                          // += ajoute du HTML à la fin du contenu existant
            else if (v.imgUrl.includes("/chaussures/")) chaussures.innerHTML += card;
        });
    });
}

/* ==================================================
@@@INTERACTIONS UTILISATEUR
    ==================================================*/
// Récupère les occasions sélectionnées par l'utilisateur
function getOccasionsSelectionnees() {
    // On récupère le conteneur parent des boutons
    const container = document.getElementById("CarOccasion");                                                    // Récupère l'élément avec l'id "CarOccasion"
    if (!container) return [];                                                                                   // Si l'élément n'existe pas, on retourne un tableau vide []

    // On sélectionne tous les boutons (Cards) qui ont la classe "active"
    const boutonsActifs = container.querySelectorAll(".Card.active");                                            // .querySelectorAll() récupère TOUS les éléments correspondants (pas seulement le 1er)

    // Array.from convertit la NodeList en tableau pour pouvoir utiliser map
    // map récupère la valeur de l'attribut data-occasion de chaque bouton actif
    return Array.from(boutonsActifs).map(btn => btn.getAttribute("data-occasion"));                              // Array.from() convertit une NodeList (liste d'éléments HTML) en tableau JavaScript
                                                                                                                 // .map() transforme chaque bouton en sa valeur data-occasion
                                                                                                                 // .getAttribute() récupère la valeur d'un attribut HTML (ex: data-occasion="sport")
}

// Gestion du clic sur le bouton "valider occasion" pour générer une tenue
let geminiLoading = false;                                                                                       // Variable globale pour éviter de lancer plusieurs requêtes en même temps
document.getElementById("valid-occasion").addEventListener("click", async () => {                                // .addEventListener() écoute les clics sur le bouton. async permet d'utiliser await

    if (geminiLoading) {                                                                                         // Si une requête est déjà en cours
        console.log("Requête déjà en cours...");                                                                 // On affiche un message dans la console
        return;                                                                                                  // Et on arrête la fonction pour éviter les doublons
    }

    geminiLoading = true;                                                                                        // On marque qu'une requête est en cours
    const bouton = document.getElementById("valid-occasion");                                                    // On récupère le bouton
    bouton.classList.add("loading");                                                                             // On ajoute la classe "loading" pour afficher un indicateur visuel (animation)
    bouton.disabled = true;                                                                                      // On désactive le bouton pour empêcher de re-cliquer dessus

    // AFFICHE LE LOADER PENDANT LA GÉNÉRATION
    const afterValide = document.querySelector(".afterValide");                                                  // On récupère la zone où afficher le loader
    if (afterValide) {                                                                                           // Si la zone existe
        afterValide.classList.add("visible");                                                                    // On rend la zone visible
        afterValide.innerHTML = `
            <div class="ai-loader">
                <div class="loader-content">
                    <div class="spinner"></div>
                    <h3>Génération en cours...</h3>
                    <p>Notre IA analyse la météo et vos préférences</p>
                </div>
            </div>
        `;                                                                                                       // On injecte le HTML du loader (spinner animé + texte)
    }

    try {                                                                                                        // try/catch permet de gérer les erreurs qui pourraient survenir
        const meteo = await getMeteoCompiegne();                                                                 // await attend que la fonction asynchrone termine avant de continuer
        const occasions = getOccasionsSelectionnees();                                                           // On récupère les occasions sélectionnées par l'utilisateur

        const prompt = buildPrompt(meteo, occasions);                                                            // On construit le texte de la requête à envoyer à Gemini
        const html = await askGemini(prompt);                                                                    // On envoie la requête à Gemini et on attend la réponse HTML

        injecterTenueDansUI(html);                                                                               // On affiche le HTML reçu dans la page (le loader sera automatiquement remplacé)

    } catch (e) {                                                                                                // Si une erreur se produit (API ne répond pas, erreur réseau, etc.)
        console.error(e);                                                                                        // .error() affiche l'erreur en rouge dans la console
        // MASQUE LE LOADER EN CAS D'ERREUR
        if (afterValide) afterValide.innerHTML = "";                                                             // On vide la zone pour masquer le loader
        alert("❌ Erreur lors de la génération de la tenue.");                                                   // On affiche une alerte à l'utilisateur
    } finally {                                                                                                  // finally s'exécute TOUJOURS, même si erreur ou pas
        bouton.classList.remove("loading");                                                                      // On retire la classe "loading" (fin de l'animation)
        bouton.disabled = false;                                                                                 // On réactive le bouton
        geminiLoading = false;                                                                                   // On marque que la requête est terminée
    }
});

/* ==================================================
@@@FONCTION D'INJECTION DANS LE DOM
    ==================================================*/
function injecterTenueDansUI(html) {
    
    const container = document.createElement("div");                                                             // Crée un conteneur temporaire pour parser le HTML reçu
    container.innerHTML = html;                                                                                  // Insère le HTML de Gemini dans le conteneur temporaire
    
    const tenue = container.querySelector(".tenue-result");                                                      // Recherche l'élément avec la classe .tenue-result dans le HTML
    
    if (!tenue) {                                                                                                // Si aucune tenue n'est trouvée dans la réponse
        const afterValide = document.querySelector(".afterValide");                                              // Récupère la zone d'affichage
        if (afterValide) {                                                                                       // Si la zone existe
            afterValide.innerHTML = `<p style="color: red;">Erreur : format invalide</p>`;                      // Affiche un message d'erreur à l'utilisateur
        }
        return;                                                                                                  // Arrête la fonction ici
    }

    const afterValide = document.querySelector(".afterValide");                                                  // Récupère la zone où afficher la tenue générée
    if (!afterValide) {                                                                                          // Si la zone n'existe pas dans le DOM
        return;                                                                                                  // Arrête la fonction
    }

    // Récupérer les données de la tenue
    const imgTenue = tenue.querySelector(".img-tenue");                                                          // Extrait l'image principale de la tenue
    const titre = tenue.querySelector("h2");                                                                     // Extrait le titre (nom de la tenue)
    const detailsSource = tenue.querySelectorAll(".cart-detail");                                                // Récupère tous les détails des vêtements (liste)

    // Construire le HTML complet des détails
    let detailsHTML = "";                                                                                        // Variable pour stocker le HTML des vêtements
    detailsSource.forEach((detail) => {                                                                          // Boucle sur chaque vêtement de la tenue
        const img = detail.querySelector("img");                                                                 // Récupère l'image du vêtement
        const title = detail.querySelector("h4");                                                                // Récupère le nom du vêtement
        const desc = detail.querySelector("p");                                                                  // Récupère la description (peut être vide)
        
        if (img && title) {                                                                                      // Si l'image ET le titre existent (vérification de sécurité)
            detailsHTML += `
                <div class="cart-detail">
                    <img class="detail-vet" src="${img.getAttribute("src")}" alt="${title.textContent}">
                    <div class="info-detail">
                        <h4>${title.textContent}</h4>
                        <p>${desc ? desc.textContent : ""}</p>
                    </div>
                </div>
            `;                                                                                                   // Construit le HTML de la carte de vêtement et l'ajoute à la variable
        }
    });

    // Injecter TOUT dans afterValide
    afterValide.innerHTML = `
    <h2>Aperçu de la Tenue</h2>
    <article>
        <div id="apercu">
            <div id="photo-apercu">
                ${imgTenue ? `<img src="${imgTenue.getAttribute("src")}" alt="${titre ? titre.textContent : ''}">` : ''}
            </div>
            <div id="info-temperature">
                <img class="soleil-logo" src="assets/img/sunLogo.png" alt="soleil">
                <p>Parfait pour <span id="info-temp"></span></p>
            </div>
        </div>
    </article>
    <article>
        ${titre ? `<h3>${titre.textContent}</h3>` : 'Détail de la tenue'}
        <div id="detail-tenu">
            ${detailsHTML}
        </div>
        <div id="favorie">
            <img src="assets/img/fav.png" id="coeur" class="favorie-icon" alt="coeur">
            <p id="favorieText" class="favorie-text">
                Enregistrer la tenue
            </p>
        </div>
    </article>
    `;                                                                                  // Remplace complètement le contenu de .afterValide par la tenue générée (image + titre + détails)
    
    // MISE À JOUR DE LA MÉTÉO DANS L'APERÇU
    const infoTemp = document.getElementById("info-temp");
    const degre = document.getElementById("degre");
    if (infoTemp && degre) {
        infoTemp.textContent = degre.textContent;
    }
    
    // RÉATTACHER L'EVENT LISTENER DU BOUTON FAVORI
    const favorieBtn = document.getElementById("favorie");
    const favorieText = document.getElementById("favorieText");
    
    if (favorieBtn && favorieText) {
        favorieBtn.addEventListener("click", () => {
            const isActive = favorieBtn.classList.toggle("active");
            
            if (isActive) {
                favorieText.textContent = "Tenue ajoutée à vos favoris";
            } else {
                favorieText.textContent = "Enregistrer la tenue";
            }
        });
    }
}

/* ==================================================
@@@EVENTS : SÉLECTION DES CARTES
    ==================================================*/
function setupActiveToggle(containerId, selector, multiple = false) {                                            // Fonction réutilisable pour gérer les clics sur des cartes. multiple = false est une valeur par défaut
    const container = document.getElementById(containerId);                                                      // On récupère le conteneur parent

    container.addEventListener("click", (e) => {                                                                 // .addEventListener() écoute les événements (ici les clics). e = l'événement qui contient des infos sur le clic
        const card = e.target.closest(selector);                                                                 // .closest() remonte dans le DOM pour trouver l'élément parent qui correspond au sélecteur
        if (!card) return;                                                                                       // Si on n'a pas cliqué sur une carte, on ne fait rien

        if (multiple) {                                                                                          // Si on peut sélectionner plusieurs cartes (mode multiple activé)
            card.classList.toggle("active");                                                                     // .toggle() ajoute la classe si elle n'existe pas, la retire si elle existe
            return;                                                                                              // On s'arrête là pour le mode multiple
        }

        // sélection unique
        document.querySelectorAll(selector).forEach(c => c.classList.remove("active"));                          // On retire la classe "active" de TOUTES les cartes du même type
        card.classList.add("active");                                                                            // Puis on ajoute "active" uniquement à la carte cliquée
    });
}

/* ==================================================
@@@INITIALISATION DES EVENTS
    ==================================================*/
setupActiveToggle("CarOccasion", ".Card");                                                                       // Active le système de sélection unique pour les cartes d'occasion
setupActiveToggle("categories", ".cardCategorie");                                                               // Active le système de sélection unique pour les catégories
setupActiveToggle("Occasions", ".bouton-occas", true);                                                           // Active le système de sélection multiple pour les occasions (true = multiple)

/* ==================================================
@@@INITIALISATION DE L'AFFICHAGE
    ==================================================*/
afficherToutesLesTenues();                                                                                       // Affiche toutes les tenues dans les catégories au chargement de la page
afficherMeteo();                                                                                                 // Affiche la météo actuelle au chargement de la page

/* ==================================================
@@@RESPONSIVE APP
    ==================================================*/
if (window.matchMedia('(min-width: 1024px)').matches) {                                                             // Pour les PC, passer en importer fichier
    document.querySelector('#ajouter-une-photo h4').textContent = 'Importer un fichier';
    document.querySelector('#ajouter-une-photo p').textContent = 'Choisissez un fichier à partir de votre ordinateur';
}

/* ==================================================
@@@MENU BURGER : OUVERTURE / FERMETURE
================================================== */
function openCloseMenu(btn) {                                                                 // Fonction appelée lors du clic sur le bouton menu
    btn.classList.toggle("change");                                                           // Ajoute ou retire la classe "change" pour l'animation du bouton
    document.getElementById("nav").classList.toggle("open");                                  // Ouvre ou ferme le menu en toggle la classe "open"
}

/* ==================================================
@@@SCROLL HORIZONTAL AVEC LA MOLETTE
================================================== */
function enableHorizontalScroll(selector) {                                                    // Fonction réutilisable pour activer le scroll horizontal
    const containers = document.querySelectorAll(selector);                                    // Sélectionne tous les éléments correspondant au sélecteur
    
    containers.forEach(container => {                                                          // Boucle sur chaque conteneur trouvé
        container.addEventListener('wheel', (e) => {                                           // Écoute l'événement de la molette
            e.preventDefault();                                                                // Empêche le scroll vertical par défaut
            container.scrollLeft += e.deltaY;                                                  // Transforme le scroll vertical de la molette en scroll horizontal
        });
    });
}

/* ==================================================
@@@SCROLL EN CLIQUANT / GLISSANT (DRAG TO SCROLL)
================================================== */

function enableDragScroll(selector) {                                                          // Fonction réutilisable pour activer le drag scroll
    const containers = document.querySelectorAll(selector);                                    // Sélectionne tous les conteneurs ciblés
    
    containers.forEach(container => {                                                          // Applique le comportement à chaque conteneur
        let isDown = false;                                                                    // Indique si le clic est maintenu
        let startX;                                                                            // Position X initiale de la souris
        let scrollLeft;                                                                        // Position de scroll initiale
        
        container.addEventListener('mousedown', (e) => {                                      // Quand l'utilisateur appuie sur la souris
            isDown = true;                                                                     // Active le mode drag
            container.style.cursor = 'grabbing';                                               // Change le curseur pour feedback visuel
            startX = e.pageX - container.offsetLeft;                                           // Stocke la position X de départ
            scrollLeft = container.scrollLeft;                                                 // Stocke la position actuelle du scroll
        });
        
        container.addEventListener('mouseleave', () => {                                       // Si la souris quitte le conteneur
            isDown = false;                                                                    // Désactive le drag
            container.style.cursor = 'grab';                                                   // Rétablit le curseur
        });
        
        container.addEventListener('mouseup', () => {                                          // Quand l'utilisateur relâche la souris
            isDown = false;                                                                    // Désactive le drag
            container.style.cursor = 'grab';                                                   // Rétablit le curseur
        });
        
        container.addEventListener('mousemove', (e) => {                                      // Quand la souris bouge
            if (!isDown) return;                                                               // Si le clic n'est pas maintenu, on ne fait rien
            e.preventDefault();                                                                // Empêche les comportements par défaut
            const x = e.pageX - container.offsetLeft;                                          // Position X actuelle de la souris
            const walk = (x - startX) * 2;                                                     // Distance de déplacement (vitesse x2)
            container.scrollLeft = scrollLeft - walk;                                          // Applique le scroll horizontal
        });
    });
}

/* ==================================================
@@@APPLICATION DES SCROLLS AUX CARROUSELS
================================================== */

enableHorizontalScroll('.vetement');                                                           // Active le scroll molette sur les vêtements
enableHorizontalScroll('#CarOccasion');                                                        // Active le scroll molette sur les occasions

enableDragScroll('.vetement');                                                                 // Active le drag scroll sur les vêtements
enableDragScroll('#CarOccasion');                                                              // Active le drag scroll sur les occasions

/* ==================================================
@@@AJOUT DE VÊTEMENT : POPUP DE SUCCÈS
================================================== */

function afficherPopupSucces() {                                                               // Fonction pour afficher la popup de succès
    let popup = document.getElementById('success-popup');                                      // Vérifie si la popup existe déjà
    
    if (!popup) {                                                                              // Si la popup n'existe pas
        popup = document.createElement('div');                                                 // Création de l'élément popup
        popup.id = 'success-popup';                                                            // Attribution de l'id
        popup.className = 'success-popup';                                                     // Attribution de la classe
        popup.innerHTML = `                                                                   
            <div class="popup-content">
                <img src="assets/img/valid.png" alt="Succès">
                <h3>Vêtement ajouté !</h3>
                <p>Votre vêtement a bien été enregistré</p>
            </div>
        `;
        document.body.appendChild(popup);                                                      // Ajout de la popup au body
    }
    
    setTimeout(() => popup.classList.add('show'), 10);                                         // Affiche la popup avec animation
    
    setTimeout(() => {                                                                         // Masque automatiquement la popup
        popup.classList.remove('show');
    }, 3000);                                                                                  // Après 3 secondes
}

/* ==================================================
@@@RÉINITIALISATION DU FORMULAIRE VÊTEMENT
================================================== */

function reinitialiserFormulaireVetement() {                                                    // Fonction pour remettre le formulaire à zéro
    const inputNom = document.getElementById('nom-vetement');                                  // Champ du nom du vêtement
    if (inputNom) {
        inputNom.value = '';                                                                   // Vide le champ texte
    }
    
    const categories = document.querySelectorAll('#categories .cardCategorie');               // Toutes les catégories
    categories.forEach(cat => cat.classList.remove('active'));                                 // Retire la sélection active
    
    const occasions = document.querySelectorAll('#Occasions .bouton-occas');                  // Toutes les occasions
    occasions.forEach(occ => occ.classList.remove('active'));                                  // Retire la sélection active
}

/* ==================================================
@@@BOUTON "ENREGISTRER LE VÊTEMENT"
================================================== */

const boutonEnregistrerVetement = document.querySelector('section:has(#ajoute-vet) .bouton-enregistre'); // Sélection du bouton enregistrer

if (boutonEnregistrerVetement) {                                                               // Vérifie que le bouton existe
    boutonEnregistrerVetement.addEventListener('click', () => {                                // Écoute le clic
        const nomVetement = document.getElementById('nom-vetement').value.trim();              // Récupère le nom du vêtement
        const categorieSelectionnee = document.querySelector('#categories .cardCategorie.active'); // Catégorie active
        
        if (!nomVetement) {                                                                    // Vérification du nom
            alert('⚠️ Veuillez entrer un nom pour le vêtement');
            return;
        }
        
        if (!categorieSelectionnee) {                                                          // Vérification de la catégorie
            alert('⚠️ Veuillez sélectionner une catégorie');
            return;
        }
        
        afficherPopupSucces();                                                                 // Affiche la popup de succès
        reinitialiserFormulaireVetement();                                                      // Réinitialise le formulaire
    });
}