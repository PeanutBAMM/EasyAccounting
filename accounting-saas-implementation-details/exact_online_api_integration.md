# Exact Online API Integratie - Technische Documentatie

## Inhoudsopgave
1. [Overzicht](#overzicht)
2. [OAuth 2.0 Authenticatie](#oauth-20-authenticatie)
3. [API Endpoints en Structuur](#api-endpoints-en-structuur)
4. [PurchaseEntry Creatie Workflow](#purchaseentry-creatie-workflow)
5. [Document en Receipt Attachment](#document-en-receipt-attachment)
6. [Gebruikersgoedkeuring en Verantwoordelijkheid](#gebruikersgoedkeuring-en-verantwoordelijkheid)
7. [Implementatie Voorbeeld](#implementatie-voorbeeld)
8. [Best Practices en Aandachtspunten](#best-practices-en-aandachtspunten)
9. [FAQ - Veelgestelde Vragen](#faq---veelgestelde-vragen)

---

## Overzicht

Deze documentatie beschrijft hoe digitale bonnen vanuit EasyAccounting naar Exact Online kunnen worden gestuurd via de Exact Online REST API. De oplossing is ontworpen om **gebruikers de volledige controle en verantwoordelijkheid** te geven door transacties eerst als "unapproved" (niet goedgekeurd) te creëren, waarna gebruikers deze handmatig moeten goedkeuren in Exact Online.

### Belangrijkste Componenten
- **OAuth 2.0 Authenticatie**: Veilige toegang tot Exact Online API
- **PurchaseEntry API**: Creëren van inkoopmutaties
- **Document Attachment API**: Koppelen van bonnetjes aan entries
- **Approval Workflow**: Gebruikers behouden controle via goedkeuringsproces

---

## OAuth 2.0 Authenticatie

Exact Online gebruikt OAuth 2.0 met het **Authorization Code** grant type voor API toegang.

### Vereiste Stappen

#### 1. Applicatie Registratie
Registreer je applicatie in Exact Online Developer Portal om credentials te verkrijgen:
- **Client ID**: Unieke identifier voor je applicatie
- **Client Secret**: Geheime sleutel voor authenticatie
- **Redirect URI**: HTTPS URL waar gebruikers naartoe worden gestuurd na autorisatie (geen localhost toegestaan)

#### 2. Authorization Request
Stuur gebruikers naar de autorisatie-endpoint:

```
https://start.exactonline.nl/api/oauth2/auth?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&force_login=1
```

**Parameters:**
- `client_id`: Je Client ID
- `redirect_uri`: De geregistreerde Redirect URI
- `response_type`: `code` (voor Authorization Code flow)
- `force_login`: `1` (optioneel, forceert login scherm)

**Gebruikersflow:**
1. Gebruiker logt in bij Exact Online
2. Gebruiker geeft permissies aan de applicatie
3. Gebruiker selecteert welke divisie(s) toegankelijk zijn
4. Redirect naar je `redirect_uri` met authorization code

#### 3. Token Exchange
Ruil de authorization code in voor een access token:

```http
POST https://start.exactonline.nl/api/oauth2/token
Content-Type: application/x-www-form-urlencoded

code={AUTHORIZATION_CODE}
&redirect_uri={REDIRECT_URI}
&grant_type=authorization_code
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 600,
  "token_type": "Bearer"
}
```

#### 4. Token Management

> [!IMPORTANT]
> Access tokens verlopen na **10 minuten (600 seconden)**. Refresh tokens zijn geldig voor **30 dagen**.

**Refresh Token Flow:**
```http
POST https://start.exactonline.nl/api/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

**Timing Richtlijnen:**
- Vernieuw tokens **30 seconden voor expiratie**
- Refresh niet eerder dan 9m 30s na uitgifte (geeft error)
- Refresh tokens zijn **single-use** - je krijgt een nieuwe refresh token bij elke vernieuwing

#### 5. API Gebruik
Gebruik the access token in alle API requests:

```http
GET https://start.exactonline.nl/api/v1/{division}/...
Authorization: Bearer {ACCESS_TOKEN}
```

---

## API Endpoints en Structuur

### Base URL
```
https://start.exactonline.nl/api/v1/{division}/
```

### Division ID Ophalen
Voor je andere API calls kunt maken, moet je de division ID ophalen:

```http
GET https://start.exactonline.nl/api/v1/current/Me?$select=CurrentDivision
Authorization: Bearer {ACCESS_TOKEN}
```

**Response:**
```json
{
  "d": {
    "results": [
      {
        "CurrentDivision": 123456
      }
    ]
  }
}
```

### Belangrijke Endpoints

| Endpoint | Method | Doel |
|----------|--------|------|
| `/api/v1/{division}/purchaseentry/PurchaseEntries` | POST | Creëer inkoopmutatie |
| `/api/v1/{division}/documents/Documents` | POST | Creëer document |
| `/api/v1/{division}/documents/DocumentAttachments` | POST | Upload attachment |
| `/api/v1/current/Me` | GET | Haal gebruikersinformatie op |

---

## PurchaseEntry Creatie Workflow

### Verplichte Velden

#### PurchaseEntry (hoofdobject)
```json
{
  "Journal": "string",        // Journal code (verplicht)
  "Supplier": "guid",         // Leverancier ID (verplicht)
  "Document": "guid",         // Document ID (optioneel, voor attachment)
  "EntryDate": "2025-12-21",  // Datum van entry
  "Currency": "EUR",          // Valuta code
  "Description": "string"     // Omschrijving
}
```

#### PurchaseEntryLines (regels)
Elke PurchaseEntry bevat een array van `PurchaseEntryLines`:

```json
{
  "AmountDC": 121.00,         // Bedrag in default currency (verplicht)
  "AmountFC": 121.00,         // Bedrag in foreign currency (verplicht)
  "GLAccount": "guid",        // Grootboekrekening ID (GUID) (verplicht)
  "Division": 123456,         // Division code (verplicht)
  "VATCode": "string",        // BTW code ID (GUID of code afhankelijk van config)
  "VATAmountDC": 21.00,       // BTW bedrag default currency
  "VATAmountFC": 21.00,       // BTW bedrag foreign currency
  "Description": "string"     // Regelomschrijving
}
```

> [!IMPORTANT]
> **Boekhoudcodes mapping:**
> Exact Online verwacht voor `GLAccount` een **GUID** (bijv. `a123...`) en niet de numerieke code (bijv. `4000`). Je moet deze codes eerst mappen.
> 
> **Zoekopdracht voor Mapping:**
> ```http
> GET /api/v1/{division}/financial/GLAccounts?$filter=Code eq '4000'&$select=ID,Code,Description
> ```

### Complete API Request Voorbeeld

```http
POST https://start.exactonline.nl/api/v1/123456/purchaseentry/PurchaseEntries
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "Journal": "70",
  "Supplier": "a1234567-89ab-cdef-0123-456789abcdef",
  "Document": "b2345678-90ab-cdef-0123-456789abcdef",
  "EntryDate": "2025-12-21",
  "Currency": "EUR",
  "Description": "Digitale bon via EasyAccounting",
  "PurchaseEntryLines": [
    {
      "AmountDC": 121.00,
      "AmountFC": 121.00,
      "GLAccount": "c3456789-01ab-cdef-0123-456789abcdef",
      "Division": 123456,
      "VATCode": "2",
      "VATAmountDC": 21.00,
      "VATAmountFC": 21.00,
      "Description": "Kantoorbenodigdheden"
    }
  ]
}
```

**Succesvolle Response:**
```json
{
  "d": {
    "EntryID": "d4567890-12ab-cdef-0123-456789abcdef",
    "EntryNumber": 20250001,
    "__metadata": {
      "uri": "https://start.exactonline.nl/api/v1/123456/purchaseentry/PurchaseEntries(guid'd4567890-12ab-cdef-0123-456789abcdef')"
    }
  }
}
```

---

## Document en Receipt Attachment

Om een bonnetje (foto) te koppelen aan een PurchaseEntry, volg je een **3-stappen proces**:

### Stap 1: Creëer Document

```http
POST https://start.exactonline.nl/api/v1/{division}/documents/Documents
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "Type": 20,  // Type 20 = Purchase Entry Document
  "Subject": "Digitale bon",
  "Category": "a1234567-89ab-cdef-0123-456789abcdef"  // Optioneel
}
```

**Response:**
```json
{
  "d": {
    "ID": "b2345678-90ab-cdef-0123-456789abcdef"
  }
}
```

> [!NOTE]
> Bewaar de `ID` voor de volgende stappen.

### Stap 2: Upload Attachment

```http
POST https://start.exactonline.nl/api/v1/{division}/documents/DocumentAttachments
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "Document": "b2345678-90ab-cdef-0123-456789abcdef",  // Document ID uit stap 1
  "Attachment": "{BASE64_ENCODED_IMAGE}",              // Bonnetje als BASE64
  "FileName": "receipt-20251221.jpg"                   // Bestandsnaam
}
```

**Ondersteunde Formaten:**
- JPG/JPEG
- PNG
- PDF
- Maximum bestandsgrootte: ~22 MB

### Stap 3: Creëer PurchaseEntry met Document Link

Gebruik de `Document` ID uit stap 1 in je PurchaseEntry request (zie eerder voorbeeld).

---

## Gebruikersgoedkeuring en Verantwoordelijkheid

> [!IMPORTANT]
> Om gebruikers de verantwoordelijkheid te laten behouden, creëren we entries in een **"unapproved" staat** waarna gebruikers deze handmatig moeten goedkeuren in Exact Online.

### Approval Mechanisme

Exact Online heeft een ingebouwd goedkeuringssysteem voor inkoopfacturen. Via de API kunnen we dit manipuleren door de **payment method** te gebruiken:

#### Creëren als "Unapproved"

Bij het creëren van een PurchaseEntry, stel de payment method in op **'K' (Cash)**:

```json
{
  "Journal": "70",
  "Supplier": "...",
  "PaymentCondition": "K",  // 'K' = Cash = Unapproved state
  // ... rest van de entry
}
```

**Effect:**
- Entry wordt **niet zichtbaar** op de 'Payments' pagina in Exact Online
- Entry heeft status **"Awaiting approval"**
- Verschijnt in de workflow van gebruikers met goedkeuringsrechten

#### Gebruiker Goedkeurt in Exact Online UI

Gebruikers met het recht "Approve purchase invoices" zien de entry in hun workflow en kunnen deze goedkeuren via:
1. **Financieel** → **Inkoop** → **Inkoopboeken**
2. Selecteer de entry met status "Awaiting approval"
3. Controleer de gegevens en het bijgevoegde bonnetje
4. Klik op **"Goedkeuren"** of **"Afkeuren"**

> [!WARNING]
> Dit is het kritieke punt waar de **gebruiker de verantwoordelijkheid** neemt voor de financiële mutatie.

#### Programmatisch "Goedkeuren" (Optioneel)

Als je later toch wilt dat de applicatie een entry programmatisch goedkeurt (niet aanbevolen voor verantwoordelijkheid):

1. **Haal payment ID op:**
```http
GET https://start.exactonline.nl/api/v1/{division}/purchaseentry/PurchaseEntries(guid'{ENTRY_ID}')?$select=PaymentReference
```

2. **Update payment method naar 'B' (Electronic):**
```http
PUT https://start.exactonline.nl/api/v1/{division}/purchaseentry/PurchaseEntries(guid'{ENTRY_ID}')
Content-Type: application/json

{
  "PaymentCondition": "B"  // 'B' = Electronic = Approved
}
```

### Goedkeuringsworkflow Configuratie

In Exact Online kunnen gebruikers gedetailleerde goedkeuringsregels instellen via:
- **Instellingen** → **Financieel** → **Inkoopfactuurgoedkeuring**

**Configuratieopties:**
- Goedkeurders per bedrag, leverancier, of kostenplaats
- Sequentiële goedkeuringsstappen
- Notificaties naar goedkeurders

---

## Implementatie Voorbeeld

### Complete Flow: Van Digitale Bon naar Goedkeuring

```typescript
// 1. OAuth Token verkrijgen (zie OAuth sectie)
const accessToken = await getAccessToken();

// 2. Division ID ophalen
const division = await getCurrentDivision(accessToken);

// 3. Bonnetje foto ophalen (van EasyAccounting)
const receiptImage = await getReceiptImage(receiptId);
const base64Image = Buffer.from(receiptImage).toString('base64');

// 4. Document creëren
const documentResponse = await fetch(
  `https://start.exactonline.nl/api/v1/${division}/documents/Documents`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Type: 20,
      Subject: 'Digitale bon via EasyAccounting'
    })
  }
);
const document = await documentResponse.json();
const documentId = document.d.ID;

// 5. Attachment uploaden
await fetch(
  `https://start.exactonline.nl/api/v1/${division}/documents/DocumentAttachments`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Document: documentId,
      Attachment: base64Image,
      FileName: `receipt-${Date.now()}.jpg`
    })
  }
);

// 6. PurchaseEntry creëren in UNAPPROVED state
const purchaseEntryResponse = await fetch(
  `https://start.exactonline.nl/api/v1/${division}/purchaseentry/PurchaseEntries`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Journal: "70",
      Supplier: supplierGuid,
      Document: documentId,
      PaymentCondition: "K",  // BELANGRIJK: 'K' = Unapproved
      EntryDate: new Date().toISOString().split('T')[0],
      Currency: "EUR",
      Description: "Digitale bon - wacht op goedkeuring",
      PurchaseEntryLines: [{
        AmountDC: totalAmount,
        AmountFC: totalAmount,
        GLAccount: glAccountGuid,
        Division: division,
        VATCode: vatCode,
        VATAmountDC: vatAmount,
        VATAmountFC: vatAmount,
        Description: description
      }]
    })
  }
);

const purchaseEntry = await purchaseEntryResponse.json();
console.log('Entry created:', purchaseEntry.d.EntryNumber);
console.log('Status: Awaiting approval in Exact Online');

// 7. Gebruiker ontvangt notificatie in Exact Online
//    en moet entry handmatig goedkeuren
```

---

## Best Practices en Aandachtspunten

### Beveiliging

> [!CAUTION]
> **Client Secret** moet veilig worden opgeslagen en NOOIT worden blootgesteld aan client-side code.

- Bewaar credentials in environment variables
- Gebruik HTTPS voor alle API communicatie
- Implementeer token refresh mechanisme
- Log geen access tokens of refresh tokens

### Error Handling

Veelvoorkomende errors en oplossingen:

| Error Code | Betekenis | Oplossing |
|------------|-----------|-----------|
| 401 Unauthorized | Token verlopen/ongeldig | Refresh access token |
| 400 Bad Request | Ongeldige request data | Valideer verplichte velden |
| 404 Not Found | Resource niet gevonden | Controleer GUID's en division ID |
| 429 Too Many Requests | Rate limit bereikt | Implementeer retry met backoff |

### Rate Limiting

Exact Online hanteert rate limits:
- **60 requests per minuut** per access token
- Implementeer exponential backoff bij 429 errors
- Batch operaties waar mogelijk

### Data Validatie

> [!TIP]
> Valideer alle data **voor** je API calls doet om failed requests te minimaliseren.

**Checklist:**
- ✅ Alle verplichte velden zijn aanwezig
- ✅ GUID's zijn in correct formaat
- ✅ Bedragen zijn numeriek en positief
- ✅ Datums zijn in ISO format (YYYY-MM-DD)
- ✅ Currency codes zijn geldig (EUR, USD, etc.)
- ✅ Base64 encoding is correct voor attachments

### Division Management

Als een gebruiker toegang heeft tot meerdere divisions:
- Laat gebruiker de gewenste division selecteren
- Bewaar division preference per gebruiker
- Valideer dat resources (leveranciers, GL accounts) bestaan in de geselecteerde division

### Leverancier en GL Account Mapping

Voor een goede user experience:
- Bouw een mapping systeem tussen jouw app en Exact Online resources
- Cache leverancier- en GL account GUID's lokaal
- Bied gebruikers een zoekfunctie om resources te vinden
- Gebruik `$select` en `$filter` queries om alleen benodigde data op te halen

**Voorbeeld: Leveranciers ophalen**
```http
GET https://start.exactonline.nl/api/v1/{division}/crm/Accounts?$filter=IsSales eq false&$select=ID,Name,Code
```

### Testing

> [!IMPORTANT]
> Test altijd in een **test/sandbox divisie** voordat je naar productie gaat.

**Test Scenario's:**
1. OAuth flow met mock redirects
2. PurchaseEntry met minimale velden
3. Document attachment met verschillende formaten
4. Approval workflow met test users
5. Token refresh mechanisme
6. Error handling bij ongeldige data

### Monitoring en Logging

Implementeer logging voor:
- Alle API requests (zonder sensitive data)
- Token refresh events
- Failed requests met error details
- Gebruiker goedkeuringsacties
- Performance metrics (response times)

---

## Samenvatting: Verantwoordelijkheid bij Gebruiker

De voorgestelde implementatie **borgt gebruikersverantwoordelijkheid** door:

1. **Entries creëren in "Unapproved" staat** (`PaymentCondition: "K"`)
2. **Gebruiker moet entry goedkeuren** in Exact Online UI
3. **Bonnetje is beschikbaar** voor verificatie tijdens goedkeuring
4. **Audit trail** is aanwezig in Exact Online
5. **Geen automatische boeking** zonder expliciete gebruikersactie

Dit betekent dat:
- ✅ Gebruiker ziet en controleert alle data
- ✅ Gebruiker neemt bewuste beslissing tot goedkeuring
- ✅ Wettelijke verantwoordelijkheid blijft bij gebruiker
- ✅ EasyAccounting faciliteert slechts het proces

---

## Nuttige Resources

- [Exact Online REST API Reference](https://start.exactonline.com/docs/HlpRestAPIResources.aspx)
- [OAuth 2.0 Authentication Guide](https://support.exactonline.com/community/s/knowledge-base#All-All-DNO-Content-oauth-eol-oauth-devstep1)
- [PurchaseEntry API Documentation](https://start.exactonline.com/docs/HlpRestAPIResourcesDetails.aspx?name=PurchaseEntryPurchaseEntries)
- [Document API Documentation](https://start.exactonline.com/docs/HlpRestAPIResourcesDetails.aspx?name=DocumentsDocuments)

---

**Documentatie Versie:** 1.0  
**Laatst Bijgewerkt:** 21 december 2025  
**Auteur:** EasyAccounting Development Team
---

## FAQ - Veelgestelde Vragen

### Kunnen we numerieke boekhoudcodes (bijv. 4000) direct meegeven?
Niet direct als tekst-string. De Exact Online REST API werkt met **GUID's (Internal IDs)** voor entiteiten zoals grootboekrekeningen en BTW-codes. Je moet de numerieke code ("4000") eerst mappen naar het corresponderende ID via een `/financial/GLAccounts` query. Zie de sectie [Boekhoudcodes mapping](#purchaseentry-creatie-workflow) voor details.

### Hoe ziet de gebruiker de bon in Exact Online?
Wanneer we een `PurchaseEntry` aanmaken die gekoppeld is aan een `Document`, wordt het bonnetje direct getoond in het boekingsscherm van Exact Online. De gebruiker hoeft dus niet te zoeken; de foto staat naast de boekingsregels voor snelle controle.

### Is de boeking direct definitief na de API call?
Nee. De boeking wordt aangemaakt in het inkoopboek, maar staat nog op **"Open"** of **"Voorlopig"**. In onze voorgestelde workflow (met `PaymentCondition: "K"`) krijgt de entry de status **"Awaiting approval"**. De gebruiker moet de boeking expliciet openen en op de knop **'Verwerken'** of **'Boeken'** drukken in Exact Online.

### Wat als een grootboekrekening niet bestaat?
De API zal een `400 Bad Request` teruggeven als een GUID niet wordt herkend. Het is daarom best practice om de lijst met grootboekrekeningen periodiek te synchroniseren of op te zoeken vlak voor de boeking.
