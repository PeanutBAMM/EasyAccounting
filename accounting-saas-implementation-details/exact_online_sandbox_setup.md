# Exact Online Sandbox & Testomgeving Setup Guide

Deze gids beschrijft de handmatige stappen die nodig zijn om een testomgeving (sandbox) in te richten voor de Exact Online API integratie.

## 1. Aanvragen Developer Subscription

Exact Online biedt geen losse "sandbox" omgeving, maar geeft ontwikkelaars een gratis **Developer Subscription**. Dit is een volledige Exact Online omgeving die je kunt gebruiken voor ontwikkeling en testen.

### Stappen:
1. Ga naar de [Exact Online Developer Signup pagina](https://start.exactonline.nl/docs/Signup.aspx?Type=D) (voor Nederland).
2. Vul je gegevens in.
3. Je ontvangt inloggegevens voor een eigen Exact Online administratie. Deze administratie is je "sandbox".

> [!NOTE]
> De Developer Subscription is gratis zolang je deze gebruikt voor ontwikkeling. Je krijgt 1 administratie (division) tot je beschikking.

---

## 2. Applicatie Registreren in het App Center

Om een Client ID en Client Secret te krijgen, moet je je applicatie registreren.

### Stappen:
1. Log in op het [Exact Online App Center](https://apps.exactonline.com/).
2. Klik rechtsboven op **"Manage my apps"**.
3. Klik op **"Register a new app"**.
4. Vul de details in:
   - **App Name**: Bijv. "EasyAccounting - Dev"
   - **Redirect URI**: Dit is de URL waar de gebruiker naartoe wordt gestuurd na inloggen. 
     - *Voor testen:* Je kunt bijv. `https://oauth.pstmn.io/v1/callback` gebruiken als je met Postman test, of de URL van je lokale development server (moet HTTPS zijn!).
     - *Belangrijk:* Localhost is **niet** toegestaan zonder HTTPS proxy.
5. Sla de app op.
6. Je ziet nu de **Client ID** en **Client Secret**. Kopieer deze direct naar je `.env` bestand.

---

## 3. Test Administratie Inrichten

Voordat je kunt boeken via de API, moet je een paar basiszaken in je nieuwe Exact administratie instellen:

1. **Dagboek aanmaken**: Zorg dat er een Inkoopdagboek is (meestal standaard aanwezig, code "70").
2. **Grootboekrekeningen**: Maak minimaal één kostenrekening aan (bijv. "4000 - Kantoorbenodigdheden").
3. **BTW-codes**: Controleer of de standaard BTW-codes (bijv. code "2" voor 21%) aanwezig zijn.
4. **Leverancier**: Maak handmatig één test-leverancier aan in Exact zodat je een ID hebt om mee te testen.

---

## 4. Testen van de Flow

Nu je de credentials en de administratie hebt, kun je de integratie testen:

### Stap 1: Autorisatie
Stuur jezelf naar de autorisatie URL (zoals beschreven in `exact_online_api_integration.md`). Log in met je nieuwe Developer account.

### Stap 2: Token Exchange
Gebruik de `code` uit de redirect URL om een access token op te halen.

### Stap 3: API Call doen
Gebruik de implementation code om een test-bonnetje naar je nieuwe administratie te sturen.

### Stap 4: Verifiëren in Exact Online
1. Log in op `start.exactonline.nl`.
2. Ga naar **Financieel > Inkoop > Inkoopboeken**.
3. Zoek je nieuwe boeking.
4. Controleer of het bonnetje (de bijlage) correct zichtbaar is.
5. Druk op de knop **"Boeken"** of **"Verwerken"** om de flow te voltooien.

---

## Handige Links
- [Exact Online App Center](https://apps.exactonline.com/)
- [Developer Portal Documentation](https://start.exactonline.com/docs/HlpRestAPIResources.aspx)
- [Status & Onderhoud (API)](https://status.exact.com/)

---
**Document Versie:** 1.0  
**Laatst Bijgewerkt:** 21 december 2025
