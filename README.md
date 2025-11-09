# Damareen - Fantasy Kártyajáték

> React + TypeScript alapú single page application a Damareen fantasy kártyajátékhoz  
> **DUSZA 2025/26 Web-Mobile Qualifier**

**🆕 Verzió 2.0:** MySQL adatbázis, felhasználói autentikáció és többfelhasználós támogatás!

---

## 📋 Tartalomjegyzék

- [Felhasználói Dokumentáció](#-felhasználói-dokumentáció)
  - [Gyors Kezdés](#gyors-kezdés)
  - [Bejelentkezés és Regisztráció](#bejelentkezés-és-regisztráció)
  - [Játékmester Mód](#játékmester-mód)
  - [Játékos Mód](#játékos-mód)
  - [Harc Mechanika](#harc-mechanika)
  - [Felhasználói Felület Funkciók](#felhasználói-felület-funkciók)
- [Fejlesztői Dokumentáció](#-fejlesztői-dokumentáció)
  - [Technológiai Stack](#technológiai-stack)
  - [Projekt Struktúra](#projekt-struktúra)
  - [Telepítés és Konfiguráció](#telepítés-és-konfiguráció)
  - [API Dokumentáció](#api-dokumentáció)
  - [Adatbázis Séma](#adatbázis-séma)
  - [Fejlesztési Parancsok](#fejlesztési-parancsok)
  - [Tesztelés](#tesztelés)
  - [Biztonsági Megfontolások](#biztonsági-megfontolások)

---

## 👤 Felhasználói Dokumentáció

### Gyors Kezdés

#### Előfeltételek
- Modern webböngésző (Chrome, Firefox, Safari, Edge)
- Internetkapcsolat a backend szerverhez
- Regisztrált felhasználói fiók

#### Első Lépések

1. **Nyissa meg az alkalmazást** a böngészőben: `http://4.182.233.175/`
2. **Regisztráljon** egy új fiókot vagy **jelentkezzen be** meglévő fiókkal
3. **Válasszon módot:**
   - **Játékmester mód**: Környezetek, kártyák és kazamaták létrehozása
   - **Játékos mód**: Játékmenet indítása, pakli építés, harcok

#### Admin Fiók
- **Felhasználónév:** `admin`
- **Jelszó:** `admin123`

**Megjegyzés:** Ez az egyetlen admin fiók a rendszerben. Új felhasználók regisztrációja normál jogosultságú fiókokat hoz létre.

---

### Bejelentkezés és Regisztráció

#### Regisztráció
1. Kattintson a **"Regisztráció"** fülre
2. Adja meg a következő adatokat:
   - **Felhasználónév**: Egyedi azonosító (kötelező)
   - **Email cím**: Érvényes email (kötelező)
   - **Jelszó**: Minimum 6 karakter (kötelező)
3. Kattintson a **"Regisztráció"** gombra
4. Sikeres regisztráció után automatikusan bejelentkezik

**Megjegyzés:** Az új felhasználók normál jogosultságú fiókokat kapnak. A Játékmester mód csak az `admin` fiókkal érhető el.

#### Bejelentkezés
1. Adja meg a **felhasználónevét** és **jelszavát**
2. Kattintson a **"Bejelentkezés"** gombra
3. A munkamenet 7 napig aktív marad

#### Kijelentkezés
- Kattintson a jobb felső sarokban található **"Kijelentkezés"** gombra

---

### Játékmester Mód

A Játékmester mód lehetővé teszi játékkörnyezetek, kártyák és kazamaták létrehozását és szerkesztését.

**Fontos:** Ez a mód csak az `admin` felhasználó számára érhető el. Normál felhasználók csak a Játékos módot használhatják.

#### 1. Környezet Létrehozása

**Lépések:**
1. Váltson **"Játékmester mód"** fülre (admin felhasználóknak elérhető)
2. A bal oldali sávban adja meg az új környezet nevét
3. Kattintson az **"Új játék"** gombra
4. Az új környezet megjelenik a listában

**Funkciók:**
- **Környezet kiválasztása**: Kattintson egy környezetre a szerkesztéshez
- **Környezet törlése**: Kattintson a **"Törlés"** gombra a környezet neve mellett
- **Környezet információk**: Látható a kártyák és kazamaták száma

#### 2. Kártyák Létrehozása

##### Alap (Standard) Kártyák

**Lépések:**
1. Válassza ki a szerkeszteni kívánt környezetet
2. Görgessen a **"Új alap kártya"** szakaszhoz
3. Töltse ki az űrlapot:
   - **Név**: Kártya neve (max 16 karakter, egyedi)
   - **Sebzés**: 2-100 közötti érték
   - **Életerő**: 1-100 közötti érték
   - **Elem**: Válasszon egyet (Föld, Víz, Levegő, Tűz)
4. Kattintson a **"Kártya hozzáadása"** gombra
5. AI képet generál a kártyához

**Elemek:**
- 🌍 **Föld** (Earth)
- 💧 **Víz** (Water)
- 💨 **Levegő** (Air)
- 🔥 **Tűz** (Fire)

##### Vezér (Leader) Kártyák

**Lépések:**
1. Görgessen a **"Új vezérkártya"** szakaszhoz
2. Válassza ki az **alapkártyát** (standard kártya)
3. Adja meg a vezér nevét
4. Válasszon módot:
   - **Dupla sebzés**: Sebzés x2
   - **Dupla életerő**: Életerő x2
5. Kattintson a **"Vezér hozzáadása"** gombra

**Megjegyzés:** Vezérkártyák az alapkártyák továbbfejlesztett változatai.

##### Kártyák Szerkesztése és Törlése

- **Kártya megtekintése**: Kattintson egy kártyára a részletek megjelenítéséhez
- **Kártya törlése**: Kattintson a **"Törlés"** gombra a kártya alatt
- **AI kép generálás**: Kattintson a **"Kép generálása"** gombra

#### 3. Kazamaták (Dungeons) Létrehozása

**Kazamata típusok:**
- **Találkozás (Encounter)**: 1 alap kártya
- **Kis kazamata (Minor)**: 3 alap kártya + 1 vezér kártya
- **Nagy kazamata (Major)**: 5 alap kártya + 1 vezér kártya

**Lépések:**
1. Görgessen a **"Új kazamata"** szakaszhoz
2. Adja meg a kazamata nevét (egyedi)
3. Válassza ki a típust
4. Töltse ki a kártya helyeket:
   - Először az alap kártyák (egyediek kell legyenek)
   - Utolsó helyre vezérkártya (minor és major esetén)
5. Kattintson a **"Kazamata hozzáadása"** gombra

**Validációs szabályok:**
- Minden helyet ki kell tölteni
- Alap kártyák nem ismétlődhetnek
- Utolsó hely vezérkártya kell legyen (minor/major esetén)

---

### Játékos Mód

A Játékos mód lehetővé teszi játékmenetek indítását, paklik építését és kazamaták elleni harcokat.

#### 1. Játékmenet (Session) Létrehozása

**Lépések:**
1. Váltson **"Játékmenet mód"** fülre
2. A bal oldali **"Új játékmenet"** szakaszban:
   - Adja meg a játékmenet nevét
   - Válassza ki a környezetet
3. Kattintson a **"Játékmenet indítása"** gombra
4. Automatikusan megkapja az összes alap kártyát a gyűjteményébe

**Funkciók:**
- **Játékmenet kiválasztása**: Kattintson egy játékmenet névre
- **Játékmenet törlése**: Kattintson a **"Törlés"** gombra

#### 2. Pakli Építés

**Lépések:**
1. Válasszon egy játékmenetet
2. A **"Gyűjtemény"** szakaszban láthatja az összes kártyáját
3. Húzza a kártyákat a **"Pakli"** szakaszba
4. A pakli sorrendje fontos - ez lesz a harci sorrend!

**Pakli Kezelés:**
- **Kártya hozzáadása**: Húzza a kártyát a gyűjteményből a pakliba
- **Kártya eltávolítása**: Húzza a kártyát a pakliból vissza a gyűjteménybe
- **Sorrend változtatás**: Húzza a kártyákat fel/le a pakli listában
- **Mobil nézet**: Használja a **"↑"** és **"↓"** gombokat

**Fontos:** A pakli hosszának meg kell egyeznie a kazamata hosszával a harc indításához!

#### 3. Harc Indítása

**Lépések:**
1. Építsen egy paklit a megfelelő hosszúsággal
2. Válasszon egy kazamatát a **"Kazamata választása"** legördülő menüből
3. Kattintson a **"Harc indítása"** gombra
4. Nézze meg a harc animációt és eredményeket

**Harc Folyamata:**
1. **Animált harc jelenet**: Vizuális megjelenítés zenével
2. **Részletes jelentés**: Körönkénti eredmények
3. **Jutalom választás**: Győzelem esetén (ha legalább annyi kört nyert, ahány kártya van a kazamatában)

#### 4. Jutalmak

**Jutalom típusok kazamata típus szerint:**
- **Találkozás (Encounter)**: +1 sebzés egy választott kártyára
- **Kis kazamata (Minor)**: +2 életerő egy választott kártyára
- **Nagy kazamata (Major)**: +3 sebzés egy választott kártyára

**Jutalom alkalmazása:**
1. Győzelem után megjelenik a jutalom választó
2. Kattintson a kártyára, amelyikre alkalmazni szeretné a jutalmat
3. A bónusz azonnal hozzáadódik a kártyához
4. A fejlesztett kártya erősebb lesz a következő harcokban

#### 5. Harctörténet

**Funkciók:**
- **Korábbi harcok megtekintése**: Lista az összes lejátszott harcról
- **Részletes információk**:
  - Kazamata neve
  - Győztes körök száma (játékos vs kazamata)
  - Eredmény (győzelem/vereség)
  - Időbélyeg
- **Szűrés**: Csak az aktuális játékmenet harcai láthatók

---

### Harc Mechanika

#### Körönkénti Harc Szabályok

**1. Sebzés Összehasonlítás**
- Ha a játékos kártya sebzése > kazamata kártya életereje → **Játékos nyer**
- Ha a kazamata kártya sebzése > játékos kártya életereje → **Kazamata nyer**

**2. Elem Előny (ha sebzés nem dönt)**
- 🔥 Tűz → 🌍 Föld
- 🌍 Föld → 💧 Víz
- 💧 Víz → 💨 Levegő
- 💨 Levegő → 🔥 Tűz

**3. Döntetlen**
- Ha sem sebzés, sem elem előny nem dönt → **Kazamata nyer**

#### Győzelmi Feltétel

- A játékos akkor nyer a harc végén, ha összességében legalább annyi kártyája nyert, mint amennyi a kazamatának.

**Példák:**
- **1 kártyás kazamata (Találkozás)**: Legalább 1 nyertes kör kell
- **4 kártyás kazamata (Kis kazamata)**: Legalább 2 nyertes kör kell
- **6 kártyás kazamata (Nagy kazamata)**: Legalább 3 nyertes kör kell

---

### Felhasználói Felület Funkciók

#### Téma Választás

**Elérhető témák:**
- 🌓 **Automatikus**: Rendszer beállítás követése
- ☀️ **Világos**: Világos téma
- 🌙 **Sötét**: Sötét téma

**Téma váltás:**
1. Kattintson a téma választó gombra (jobb felső sarok)
2. Válassza ki a kívánt témát
3. A beállítás mentésre kerül

#### Nyelv Választás

**Elérhető nyelvek:**
- 🇭🇺 **Magyar** (Hungarian)
- 🇬🇧 **Angol** (English)
- 🇩🇪 **Német** (German)

**Nyelv váltás:**
1. Kattintson a nyelv választó gombra (jobb felső sarok)
2. Válassza ki a kívánt nyelvet
3. Az egész felület azonnal lefordítódik

#### Oldalsáv Összecsukás

**Funkció:**
- Bal oldali oldalsáv összecsukható több munkaterületért
- Kattintson a **"←"** / **"→"** gombra
- Mobil nézetben: **"↑"** / **"↓"** gomb
- Beállítás automatikusan mentésre kerül

#### Tutorial Rendszer

**Első használatkor:**
1. Automatikusan elindul egy interaktív tutorial
2. Lépésről lépésre végigvezet a főbb funkciókon
3. Kiemeli a fontos UI elemeket
4. Átugorható vagy később újraindítható

#### Kártya Előnézet

**Funkciók:**
- **Hover effekt**: Kártya kiemelése egérrel
- **Elem színek**: Minden elem saját színsémával
- **Statisztikák**: Sebzés, életerő, elem látható
- **Bónuszok**: Fejlesztések zöld színnel jelölve
- **Háttérkép**: AI generált képek megjelenítése

#### Harc Animáció

**Vizuális élmény:**
- 🎵 **Háttérzene**: Epikus battle zenével
- 🎬 **Animált körök**: Körönkénti megjelenítés
- 🎨 **Kártya animációk**: Forgás, fade effektek
- ⚔️ **Ütközés effektek**: Vizuális visszajelzés
- 🏆 **Eredmény megjelenítés**: Győzelem/vereség képernyő

#### Visszajelzések és Értesítések

**Típusok:**
- ℹ️ **Info üzenetek**: Sikeres műveletek (zöld)
- ❌ **Hiba üzenetek**: Validációs hibák (piros)
- ⏳ **Betöltés**: Spinner animációk
- ✅ **Megerősítések**: Törlés előtti dialógusok

#### Reszponzív Dizájn

**Támogatott eszközök:**
- 💻 **Desktop**: Teljes funkcionalitás
- 📱 **Tablet**: Optimalizált elrendezés
- 📱 **Mobil**: Érintés alapú vezérlés
- 👆 **Touch képernyők**: Drag & drop alternatívák

---

## 🔧 Fejlesztői Dokumentáció

### Technológiai Stack

#### Frontend
- **Framework**: React 19.1.1
- **Nyelv**: TypeScript 5.9.3
- **Build Tool**: Vite 7.1.7
- **Styling**: CSS (vanilla, CSS variables)
- **State Management**: React Context API
- **Routing**: Single Page Application (no routing library)

#### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Nyelv**: JavaScript (ES Modules)
- **Adatbázis**: MySQL 8.0+
- **ORM**: mysql2 (raw queries)
- **Autentikáció**: JWT (jsonwebtoken 9.0.2)
- **Jelszó hash**: bcrypt 5.1.1

#### Fejlesztői Eszközök
- **Linter**: ESLint 9.36.0
- **Type Checking**: TypeScript Compiler
- **Testing**: Vitest (battle logic tests)
- **Version Control**: Git

---

### Projekt Struktúra

```
dusza_web_25_26/
│
├── backend/                      # Backend szerver
│   ├── auth.js                   # JWT autentikáció middleware
│   ├── database.sql              # MySQL séma
│   ├── db.js                     # Adatbázis kapcsolat
│   ├── init-db.js                # DB inicializáló script
│   ├── server.js                 # Express szerver és API endpoints
│   ├── package.json              # Backend dependencies
│   └── .env                      # Környezeti változók (gitignore-d)
│
├── src/                          # Frontend forráskód
│   ├── components/               # React komponensek
│   │   ├── Auth.tsx              # Bejelentkezés/regisztráció
│   │   ├── BattleReport.tsx      # Harc eredmény megjelenítés
│   │   ├── BattleScene.tsx       # Animált harc jelenet
│   │   ├── CardPreview.tsx       # Kártya előnézet komponens
│   │   ├── ConfirmDialog.tsx     # Megerősítő dialógus
│   │   ├── EnvironmentEditor.tsx # Játékmester szerkesztő
│   │   ├── LanguageSelector.tsx  # Nyelv választó
│   │   ├── PlayerHub.tsx         # Játékos központ
│   │   ├── ThemeSelector.tsx     # Téma választó
│   │   └── Tutorial.tsx          # Tutorial rendszer
│   │
│   ├── state/                    # Context providers
│   │   ├── AuthContext.tsx       # Autentikáció state
│   │   ├── GameDataContext.tsx   # Játék adatok (environments, players)
│   │   ├── LanguageContext.tsx   # Többnyelvűség
│   │   ├── ThemeContext.tsx      # Téma kezelés
│   │   └── TutorialContext.tsx   # Tutorial state
│   │
│   ├── utils/                    # Utility függvények
│   │   ├── battle.ts             # Harc logika
│   │   ├── battle.test.ts        # Harc tesztek
│   │   ├── rewards.ts            # Jutalom logika
│   │   ├── rewards.test.ts       # Jutalom tesztek
│   │   └── id.ts                 # ID generálás
│   │
│   ├── services/                 # API szolgáltatások
│   │   └── api.ts                # Backend API hívások
│   │
│   ├── i18n/                     # Internationalization
│   │   └── translations.ts       # Fordítások (hu, en, de)
│   │
│   ├── data/                     # Statikus adatok
│   │   └── defaultEnvironment.ts # Alapértelmezett játékkörnyezet
│   │
│   ├── types.ts                  # TypeScript típusdefiníciók
│   ├── App.tsx                   # Fő alkalmazás komponens
│   ├── App.css                   # Fő stílusok
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Globális stílusok
│
├── public/                       # Statikus fájlok
│   ├── audio/
│   │   └── battle.mp3            # Harc háttérzene
│   ├── images/                   # Generált kártya képek
│   └── favicon.svg               # Favicon
│
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite konfiguráció
├── tsconfig.json                 # TypeScript konfiguráció
├── eslint.config.js              # ESLint konfiguráció
├── package.json                  # Frontend dependencies
└── README.md                     # Ez a fájl
```

---

### Telepítés és Konfiguráció

#### 1. Előfeltételek Telepítése

**Node.js telepítése:**
```bash
# Windows: Töltse le a https://nodejs.org oldalról
# macOS (Homebrew):
brew install node

# Linux (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**MySQL telepítése:**
```bash
# Windows: Töltse le a https://dev.mysql.com/downloads/mysql/
# macOS (Homebrew):
brew install mysql
brew services start mysql

# Linux (Ubuntu/Debian):
sudo apt-get install mysql-server
sudo systemctl start mysql
```

#### 2. Projekt Klónozása

```bash
git clone <repository-url>
cd dusza_web_25_26
```

#### 3. MySQL Adatbázis Beállítása

**Opció A: Manuális SQL futtatás**
```bash
# Jelentkezz be MySQL-be
mysql -u root -p

# Futtasd a séma scriptet
source backend/database.sql;

# Ellenőrizd a táblákat
USE damareen_game;
SHOW TABLES;
```

**Opció B: Inicializáló script használata**
```bash
cd backend
npm install
npm run init-db
```

#### 4. Backend Konfiguráció

```bash
cd backend

# Másolja az env példát
cp env.example .env

# Szerkessze a .env fájlt
nano .env
```

**`.env` fájl tartalma:**
```env
# MySQL Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=damareen_game

# JWT Secret (generálj egy random stringet)
JWT_SECRET=your_super_secret_jwt_key_change_this

# Server Configuration
PORT=3001
NODE_ENV=development

# Image Generation (optional)
OPENAI_API_KEY=your_openai_api_key_if_you_have_one
```

**Függőségek telepítése:**
```bash
npm install
```

**Backend indítása:**
```bash
npm start
# vagy fejlesztői módban:
npm run dev
```

#### 5. Frontend Konfiguráció

```bash
# Menj vissza a projekt gyökérbe
cd ..

# Másold az env példát (ha van)
cp env.example .env

# Telepítsd a függőségeket
npm install

# Indítsd el a dev szervert
npm run dev
```

**Frontend elérhető:** `http://localhost:5173`

#### 6. Admin Felhasználó

**Az admin fiók már létezik az adatbázisban:**
- **Felhasználónév:** `admin`
- **Jelszó:** `admin123`

**Megjegyzés:** Ez az egyetlen admin jogosultságú fiók. Új felhasználók regisztrációja csak normál jogosultságú fiókokat hoz létre, amelyek nem férhetnek hozzá a Játékmester módhoz.

---

### API Dokumentáció

#### Autentikáció Endpoints

##### POST `/api/auth/register`
Új felhasználó regisztrációja.

**Request Body:**
```json
{
  "username": "string (kötelező)",
  "email": "string (kötelező, email formátum)",
  "password": "string (kötelező, min 6 karakter)"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "id": 1,
    "username": "username",
    "email": "email@example.com",
    "tutorialCompleted": false
  }
}
```

**Hibák:**
- `400`: Hiányzó mezők vagy validációs hiba
- `500`: Szerver hiba

---

##### POST `/api/auth/login`
Felhasználó bejelentkezése.

**Request Body:**
```json
{
  "username": "string (kötelező)",
  "password": "string (kötelező)"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "jwt_token_string",
  "user": {
    "id": 1,
    "username": "username",
    "email": "email@example.com",
    "tutorialCompleted": true
  }
}
```

**Hibák:**
- `400`: Hiányzó mezők
- `401`: Helytelen felhasználónév vagy jelszó
- `500`: Szerver hiba

---

##### GET `/api/auth/me`
Aktuális bejelentkezett felhasználó adatai.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "id": 1,
  "username": "username",
  "email": "email@example.com",
  "tutorialCompleted": true
}
```

**Hibák:**
- `401`: Nincs autentikáció vagy lejárt token
- `500`: Szerver hiba

---

##### PUT `/api/auth/tutorial-complete`
Tutorial befejezettként jelölése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### Environment Endpoints

##### GET `/api/environments`
Felhasználó összes környezetének lekérése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
[
  {
    "id": "environment_abc123",
    "name": "Damareen Alapkor",
    "worldCards": [
      {
        "id": "card_xyz789",
        "name": "Tűz Harcos",
        "damage": 10,
        "health": 8,
        "element": "fire",
        "kind": "standard",
        "backgroundImage": "/images/card_xyz789.jpg"
      }
    ],
    "dungeons": [
      {
        "id": "dungeon_def456",
        "name": "Első Próba",
        "type": "encounter",
        "cardOrder": ["card_xyz789"]
      }
    ]
  }
]
```

---

##### POST `/api/environments`
Új környezet létrehozása vagy meglévő frissítése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "id": "environment_abc123",
  "name": "Új Környezet",
  "worldCards": [...],
  "dungeons": [...]
}
```

**Response (200):**
```json
{
  "success": true,
  "environment": { ... }
}
```

---

##### DELETE `/api/environments/:id`
Környezet törlése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true
}
```

**Hibák:**
- `404`: Környezet nem található
- `403`: Nincs jogosultság

---

#### Player Endpoints

##### GET `/api/players`
Felhasználó összes játékosának lekérése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
[
  {
    "id": "player_abc123",
    "name": "Kalandozó",
    "environmentId": "environment_xyz789",
    "collection": [
      {
        "cardId": "card_def456",
        "damageBonus": 2,
        "healthBonus": 1
      }
    ],
    "deck": [
      { "cardId": "card_def456" }
    ],
    "battleHistory": [
      {
        "dungeonId": "dungeon_ghi789",
        "playerWins": 3,
        "dungeonWins": 0,
        "playerVictory": true,
        "timestamp": 1699564800000
      }
    ]
  }
]
```

---

##### POST `/api/players`
Új játékos létrehozása.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "id": "player_abc123",
  "name": "Új Játékos",
  "environmentId": "environment_xyz789",
  "collection": [...],
  "deck": [],
  "battleHistory": []
}
```

**Response (200):**
```json
{
  "success": true,
  "player": { ... }
}
```

---

##### PUT `/api/players/:id`
Játékos frissítése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "Frissített Név",
  "collection": [...],
  "deck": [...],
  "battleHistory": [...]
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

##### DELETE `/api/players/:id`
Játékos törlése.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true
}
```

---

#### Image Generation Endpoint

##### POST `/api/generate-image`
AI kép generálás kártyákhoz (OpenAI DALL-E).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "prompt": "Tűz Harcos"
}
```

**Response (200):**
```json
{
  "success": true,
  "path": "/images/card_abc123.jpg"
}
```

**Megjegyzés:** A működéshez szükséges az `OPENAI_API_KEY` a `.env` fájlban.

---

### Adatbázis Séma

#### Táblák Áttekintése

**users** - Felhasználói fiókok
```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    tutorial_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**environments** - Játékkörnyezetek
```sql
CREATE TABLE environments (
    id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**world_cards** - Kártyák
```sql
CREATE TABLE world_cards (
    id VARCHAR(100) PRIMARY KEY,
    environment_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    damage INT NOT NULL,
    health INT NOT NULL,
    element ENUM('earth', 'water', 'air', 'fire') NOT NULL,
    kind ENUM('standard', 'leader') NOT NULL,
    source_card_id VARCHAR(100) NULL,
    background_image VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
);
```

**dungeons** - Kazamaták
```sql
CREATE TABLE dungeons (
    id VARCHAR(100) PRIMARY KEY,
    environment_id VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('encounter', 'minor', 'major') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
);
```

**dungeon_card_order** - Kazamata kártya sorrend
```sql
CREATE TABLE dungeon_card_order (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dungeon_id VARCHAR(100) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES world_cards(id) ON DELETE CASCADE
);
```

**player_profiles** - Játékos profilok
```sql
CREATE TABLE player_profiles (
    id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    environment_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
);
```

**player_cards** - Játékos kártya gyűjtemény
```sql
CREATE TABLE player_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    damage_bonus INT NOT NULL,
    health_bonus INT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES world_cards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_player_card (player_id, card_id)
);
```

**player_deck** - Játékos pakli
```sql
CREATE TABLE player_deck (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    card_id VARCHAR(100) NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (player_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (card_id) REFERENCES world_cards(id) ON DELETE CASCADE
);
```

**battle_history** - Harctörténet
```sql
CREATE TABLE battle_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(100) NOT NULL,
    dungeon_id VARCHAR(100) NOT NULL,
    player_wins INT NOT NULL,
    dungeon_wins INT NOT NULL,
    player_victory BOOLEAN NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES player_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (dungeon_id) REFERENCES dungeons(id) ON DELETE CASCADE
);
```

#### Kapcsolatok

```
users (1) ─── (N) environments
users (1) ─── (N) player_profiles

environments (1) ─── (N) world_cards
environments (1) ─── (N) dungeons
environments (1) ─── (N) player_profiles

dungeons (1) ─── (N) dungeon_card_order ─── (1) world_cards

player_profiles (1) ─── (N) player_cards ─── (1) world_cards
player_profiles (1) ─── (N) player_deck ─── (1) world_cards
player_profiles (1) ─── (N) battle_history ─── (1) dungeons
```

---

### Biztonsági Megfontolások

#### Implementált Biztonsági Intézkedések

**1. Jelszó Biztonság**
- ✅ Bcrypt hash (10 rounds)
- ✅ Minimum 6 karakteres jelszó követelmény
- ✅ Jelszavak soha nem kerülnek logolásra

**2. Autentikáció**
- ✅ JWT token alapú
- ✅ 7 napos token lejárat
- ✅ Token tárolás localStorage-ban
- ✅ Automatikus token ellenőrzés minden API hívásnál

**3. Autorizáció**
- ✅ Minden védett endpoint ellenőrzi a tokent
- ✅ Felhasználók csak saját adataikat látják
- ✅ User ID a tokenből származik (nem a kérésből)

**4. SQL Injection Védelem**
- ✅ Prepared statements használata
- ✅ Paraméterizált lekérdezések
- ✅ Nincs közvetlen string konkatenáció SQL-ben

**5. XSS Védelem**
- ✅ React automatikus escape-elése
- ✅ Nincs `dangerouslySetInnerHTML` használat
- ✅ Input validáció és sanitizáció

**6. CORS**
- ✅ CORS engedélyezve fejlesztéshez

---

### Deployment

#### Production Build

**Frontend:**
```bash
# Build
npm run build

# A dist/ mappa tartalmazza a statikus fájlokat
# Ezeket szolgáld ki egy web szerverrel (nginx, Apache, stb.)
```

**Backend:**
```bash
# Állítsa be a production környezetet
NODE_ENV=production

# Használjon process manager-t (PM2)
npm install -g pm2
pm2 start server.js --name damareen-backend
pm2 save
pm2 startup
```

**Megjegyzés:** A PM2 automatikusan újraindítja a szervert hiba vagy rendszer újraindítás esetén.

---

**Fejlesztők:**
- Kupeczki Ádám
- Junghausz Benedek
- Nagy-Brunner Szilárd

---

#### Hasznos Linkek

**Dokumentációk:**
- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Express Docs](https://expressjs.com/)
- [MySQL Docs](https://dev.mysql.com/doc/)

**Eszközök:**
- [Vite](https://vitejs.dev/)
- [ESLint](https://eslint.org/)
- [Vitest](https://vitest.dev/)

---

## 🎮 Élvezze a Játékot!
