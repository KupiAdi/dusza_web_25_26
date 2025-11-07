# Damareen Card Game Companion

React + TypeScript single page application that implements the Damareen fantasy card game workflow for the DUSZA 2025/26 web-mobile qualifier. The app covers both Game Master tooling (world setup) and Player workflow (deck building, dungeon fights, rewards) according to the competition specification.

**🆕 Version 2.0:** Now with MySQL database, user authentication, and multi-user support!

## Quick start

### Prerequisites

- Node.js (v16 or newer)
- MySQL Server (v8.0 or newer)
- npm package manager

### Installation

1. **Setup MySQL Database**

```bash
# Login to MySQL
mysql -u root -p

# Run the database setup script
source backend/database.sql;
```

2. **Configure Backend**

```bash
cd backend

# Copy environment example
cp env.example .env

# Edit .env and add your MySQL credentials:
# DB_USER=your_mysql_username
# DB_PASSWORD=your_mysql_password
# JWT_SECRET=your_random_secret_key

# Install dependencies
npm install

# Initialize database (alternative to manual SQL)
npm run init-db

# Start backend server
npm start
```

3. **Configure Frontend**

```bash
# Go back to project root
cd ..

# Copy environment example
cp env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

4. **Access the Application**

Open your browser and navigate to `http://localhost:5173`

First time? Click "Regisztráció" to create an account!

## What's New in v2.0

### 🔐 User Authentication
- Secure registration and login system
- JWT token-based authentication
- Password hashing with bcrypt
- Session management (7-day token expiry)

### 🗄️ MySQL Database
- Persistent data storage
- User-specific environments and players
- Complete data isolation between users
- Automatic data relationships and cascading deletes

### 👥 Multi-User Support
- Each user has their own environments
- Each user has their own player profiles
- Users cannot see each other's data
- Secure API endpoints with authentication

### 🌐 REST API
- Full backend API for all operations
- Environment management endpoints
- Player management endpoints
- Battle history tracking
- AI image generation (authenticated)

## Role overview

- **Game Master mode** - create and maintain game environments: world cards, derived leader cards, starter collections, and dungeon definitions. The editor enforces the published limits (unique names, stat ranges, unique standard cards per dungeon, required leader placement for minor/major dungeons).
- **Player mode** - start a new play session within any available environment, build ordered decks from the personal collection, run dungeon battles with a detailed combat log, and apply stat rewards when victorious. Decks must match the dungeon length before a fight can begin.

## Default content

The app ships with a ready-to-play environment named **Damareen Alapkor** featuring sample standard and leader cards plus three dungeons (encounter, minor, major). Game Masters can extend or replace this environment or create new ones from scratch.

**Note:** After implementing authentication, you'll need to create your own environments as each user has their own separate data.

## Combat rules implementation

- Damage greater than opponent health resolves the round immediately.
- Elemental advantage follows the specified cycle (fire > earth > water > air > fire). Elemental advantage only applies when the damage comparison does not decide the round.
- If damage and elements result in a stalemate, the dungeon card wins by rule.
- A battle counts as a victory only when every dungeon card is defeated, matching the brief requirement.
- Rewards are applied after victories: +1 damage (encounter), +2 health (minor), +3 damage (major). The player chooses the target card from the collection.

## Key screens

- **Login/Register** - Secure authentication screen for user access
- **Environment sidebar** - manage available worlds, create new environments, or remove unused ones (user-specific)
- **Game Master workspace** - forms for adding standard cards, deriving leader cards, managing starter collections, and assembling dungeon lineups with live validation
- **Player hub** - start games, review collections, build ordered decks (with drag-up/down controls), trigger battles, review logs, and view historical fights (user-specific)

## Visual polish

- Modern authentication UI with smooth transitions
- Loading states and spinners for async operations
- Card previews now render element themed gradients and stats with lightweight hover motion for quick recognition
- Battle reports animate round entries sequentially so the flow of each clash stays readable at a glance
- Reward selection and deck building reuse the same interactive card tiles, keeping actions close to the context

## Development scripts

```bash
# Frontend
npm run dev     # start Vite in watch mode
npm run build   # produce production bundle with type checking
npm run preview # preview the production bundle

# Backend
cd backend
npm start       # start backend server
npm run init-db # initialize database from SQL file
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Environments
- `GET /api/environments` - Get user's environments
- `POST /api/environments` - Create/update environment
- `DELETE /api/environments/:id` - Delete environment

### Players
- `GET /api/players` - Get user's players
- `POST /api/players` - Create player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Images
- `POST /api/generate-image` - Generate AI image for cards

## Database Schema

The application uses the following tables:
- `users` - User accounts
- `environments` - Game environments (user-specific)
- `world_cards` - Cards in environments
- `starter_collection` - Starting card collections
- `dungeons` - Dungeon definitions
- `dungeon_card_order` - Card order in dungeons
- `player_profiles` - Player profiles (user-specific)
- `player_cards` - Player card collections
- `player_deck` - Player deck configurations
- `battle_history` - Battle results and history

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT token authentication (7-day expiry)
- Protected API endpoints (authentication required)
- Data isolation (users can only access their own data)
- SQL injection protection (prepared statements)

## Documentation

- `SETUP.md` - Detailed setup instructions (Hungarian)
- `GYORSINDITAS.md` - Quick start guide (Hungarian)
- `VALTOZASOK.md` - Changelog and migration guide (Hungarian)
- `backend/database.sql` - Complete database schema

## Known gaps and notes

- The battle resolver requires a perfect sweep to claim victory (matching the Hungarian brief literally). Adjust `runBattle` if a different win condition is preferred.
- Accessibility focuses on keyboardable controls and clear focus styles, but screen reader texts have not been audited.
- ~~No backend integration is provided; persistence relies on browser storage.~~ **✅ Now with full backend integration!**

## Migration from v1.0

**Important:** The new version uses MySQL database instead of localStorage. Old data in localStorage will **not** be automatically migrated. You'll need to recreate your environments and players after setting up the database.

## Troubleshooting

### "Error connecting to MySQL database"
- Check if MySQL server is running
- Verify credentials in `backend/.env`
- Try connecting manually: `mysql -u DB_USER -p`

### "Nincs autentikáció" error
- Check if backend is running on port 3001
- Verify JWT_SECRET in `backend/.env`
- Try logging in again

### Port already in use
- Change PORT in `backend/.env` for backend
- Use `npm run dev -- --port 5174` for frontend

## Future ideas

- Password reset functionality via email
- Profile editing (email and password change)
- Environment sharing between users
- Admin panel for user management
- Player statistics and leaderboards
- Real-time updates with WebSocket
- Export/import environments as JSON

---

**Version:** 2.0.0  
**License:** ISC  
**Competition:** DUSZA 2025/26 Web-Mobile Qualifier

Let us know if extra quality-of-life features (search, filtering, desktop shortcuts) are required; the structure is ready for incremental enhancements.
