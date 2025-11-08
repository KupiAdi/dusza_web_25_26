import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import db from './db.js';
import { generateToken, authMiddleware } from './auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Biztosítjuk, hogy a public/images mappa létezik
const imagesDir = join(__dirname, '..', 'public', 'images');
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

// Statikus fájlok kiszolgálása az images mappából
app.use('/images', express.static(imagesDir));

// ==================== AUTH ENDPOINTS ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Minden mező kitöltése kötelező' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie' });
    }

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'A felhasználónév vagy email már foglalt' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const userId = result.insertId;
    const token = generateToken(userId, username);

    res.json({
      success: true,
      token,
      user: { id: userId, username, email }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Hiba a regisztráció során' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Felhasználónév és jelszó megadása kötelező' });
    }

    // Find user
    const [users] = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Helytelen felhasználónév vagy jelszó' });
    }

    const user = users[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Helytelen felhasználónév vagy jelszó' });
    }

    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Hiba a bejelentkezés során' });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Felhasználó nem található' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Hiba a felhasználó lekérdezése során' });
  }
});

// ==================== ENVIRONMENT ENDPOINTS ====================

// Get all environments for current user
app.get('/api/environments', authMiddleware, async (req, res) => {
  try {
    // Get the current user's username to check if admin
    const [currentUser] = await db.query(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    const isAdmin = currentUser.length > 0 && currentUser[0].username === 'admin';
    
    let environments;
    if (isAdmin) {
      // Admin sees only their own environments
      [environments] = await db.query(
        'SELECT id, name, created_at, updated_at FROM environments WHERE user_id = ?',
        [req.user.userId]
      );
    } else {
      // Non-admin users see environments created by admin
      const [adminUser] = await db.query(
        'SELECT id FROM users WHERE username = ?',
        ['admin']
      );
      
      if (adminUser.length === 0) {
        return res.json({ environments: [] });
      }
      
      [environments] = await db.query(
        'SELECT id, name, created_at, updated_at FROM environments WHERE user_id = ?',
        [adminUser[0].id]
      );
    }

    // For each environment, get cards, dungeons, and starter collection
    const enrichedEnvironments = await Promise.all(
      environments.map(async (env) => {
        // Get world cards
        const [worldCards] = await db.query(
          'SELECT id, name, damage, health, element, kind, source_card_id as sourceCardId, background_image as backgroundImage FROM world_cards WHERE environment_id = ?',
          [env.id]
        );

        // Get starter collection
        const [starterCards] = await db.query(
          'SELECT card_id FROM starter_collection WHERE environment_id = ? ORDER BY sort_order',
          [env.id]
        );

        // Get dungeons
        const [dungeons] = await db.query(
          'SELECT id, name, type FROM dungeons WHERE environment_id = ?',
          [env.id]
        );

        // For each dungeon, get card order
        const dungeonsWithCards = await Promise.all(
          dungeons.map(async (dungeon) => {
            const [cardOrder] = await db.query(
              'SELECT card_id FROM dungeon_card_order WHERE dungeon_id = ? ORDER BY position',
              [dungeon.id]
            );
            return {
              ...dungeon,
              cardOrder: cardOrder.map(row => row.card_id)
            };
          })
        );

        return {
          id: env.id,
          name: env.name,
          worldCards,
          starterCollection: starterCards.map(row => row.card_id),
          dungeons: dungeonsWithCards
        };
      })
    );

    res.json({ environments: enrichedEnvironments });
  } catch (error) {
    console.error('Get environments error:', error);
    res.status(500).json({ error: 'Hiba a környezetek lekérdezése során' });
  }
});

// Create or update environment
app.post('/api/environments', authMiddleware, async (req, res) => {
  const connection = await db.getConnection();
  try {
    // Check if user is admin
    const [currentUser] = await connection.query(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (currentUser.length === 0 || currentUser[0].username !== 'admin') {
      return res.status(403).json({ error: 'Csak az admin felhasználó hozhat létre környezetet' });
    }

    await connection.beginTransaction();

    const { environment } = req.body;
    const { id, name, worldCards, starterCollection, dungeons } = environment;

    // Check if environment exists
    const [existing] = await connection.query(
      'SELECT id FROM environments WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (existing.length === 0) {
      // Create new environment
      await connection.query(
        'INSERT INTO environments (id, user_id, name) VALUES (?, ?, ?)',
        [id, req.user.userId, name]
      );
    } else {
      // Update existing environment
      await connection.query(
        'UPDATE environments SET name = ? WHERE id = ? AND user_id = ?',
        [name, id, req.user.userId]
      );

      // Delete existing cards, dungeons, etc. (cascade will handle related data)
      await connection.query('DELETE FROM world_cards WHERE environment_id = ?', [id]);
      await connection.query('DELETE FROM dungeons WHERE environment_id = ?', [id]);
      await connection.query('DELETE FROM starter_collection WHERE environment_id = ?', [id]);
    }

    // Insert world cards
    if (worldCards && worldCards.length > 0) {
      const cardValues = worldCards.map(card => [
        card.id,
        id,
        card.name,
        card.damage,
        card.health,
        card.element,
        card.kind,
        card.sourceCardId || null,
        card.backgroundImage || null
      ]);

      await connection.query(
        'INSERT INTO world_cards (id, environment_id, name, damage, health, element, kind, source_card_id, background_image) VALUES ?',
        [cardValues]
      );
    }

    // Insert starter collection
    if (starterCollection && starterCollection.length > 0) {
      const starterValues = starterCollection.map((cardId, index) => [
        id,
        cardId,
        index
      ]);

      await connection.query(
        'INSERT INTO starter_collection (environment_id, card_id, sort_order) VALUES ?',
        [starterValues]
      );
    }

    // Insert dungeons
    if (dungeons && dungeons.length > 0) {
      for (const dungeon of dungeons) {
        await connection.query(
          'INSERT INTO dungeons (id, environment_id, name, type) VALUES (?, ?, ?, ?)',
          [dungeon.id, id, dungeon.name, dungeon.type]
        );

        // Insert dungeon card order
        if (dungeon.cardOrder && dungeon.cardOrder.length > 0) {
          const orderValues = dungeon.cardOrder.map((cardId, index) => [
            dungeon.id,
            cardId,
            index
          ]);

          await connection.query(
            'INSERT INTO dungeon_card_order (dungeon_id, card_id, position) VALUES ?',
            [orderValues]
          );
        }
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Környezet mentve' });
  } catch (error) {
    await connection.rollback();
    console.error('Save environment error:', error);
    res.status(500).json({ error: 'Hiba a környezet mentése során' });
  } finally {
    connection.release();
  }
});

// Delete environment
app.delete('/api/environments/:id', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    const [currentUser] = await db.query(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (currentUser.length === 0 || currentUser[0].username !== 'admin') {
      return res.status(403).json({ error: 'Csak az admin felhasználó törölhet környezetet' });
    }

    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM environments WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Környezet nem található' });
    }

    res.json({ success: true, message: 'Környezet törölve' });
  } catch (error) {
    console.error('Delete environment error:', error);
    res.status(500).json({ error: 'Hiba a környezet törlése során' });
  }
});

// ==================== PLAYER ENDPOINTS ====================

// Get all players for current user
app.get('/api/players', authMiddleware, async (req, res) => {
  try {
    const [players] = await db.query(
      'SELECT id, name, environment_id as environmentId FROM player_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    // For each player, get collection, deck, and battle history
    const enrichedPlayers = await Promise.all(
      players.map(async (player) => {
        // Get collection
        const [collection] = await db.query(
          'SELECT card_id as cardId, damage, health FROM player_cards WHERE player_id = ?',
          [player.id]
        );

        // Get deck
        const [deck] = await db.query(
          'SELECT card_id as cardId FROM player_deck WHERE player_id = ? ORDER BY position',
          [player.id]
        );

        // Get battle history
        const [battles] = await db.query(
          'SELECT dungeon_id as dungeonId, player_wins as playerWins, dungeon_wins as dungeonWins, player_victory as playerVictory, battle_data as battleData, timestamp FROM battle_history WHERE player_id = ? ORDER BY timestamp DESC',
          [player.id]
        );

        const battleHistory = battles.map(battle => ({
          dungeonId: battle.dungeonId,
          playerWins: battle.playerWins,
          dungeonWins: battle.dungeonWins,
          playerVictory: Boolean(battle.playerVictory),
          rounds: typeof battle.battleData === 'string' ? JSON.parse(battle.battleData) : battle.battleData,
          timestamp: battle.timestamp
        }));

        return {
          ...player,
          collection,
          deck,
          battleHistory
        };
      })
    );

    res.json({ players: enrichedPlayers });
  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({ error: 'Hiba a játékosok lekérdezése során' });
  }
});

// Create player
app.post('/api/players', authMiddleware, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { player } = req.body;
    const { id, name, environmentId, collection, deck } = player;

    // Verify environment exists (can be owned by admin or current user)
    const [envCheck] = await connection.query(
      'SELECT id FROM environments WHERE id = ?',
      [environmentId]
    );

    if (envCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'A környezet nem található' });
    }

    // Create player
    await connection.query(
      'INSERT INTO player_profiles (id, user_id, name, environment_id) VALUES (?, ?, ?, ?)',
      [id, req.user.userId, name, environmentId]
    );

    // Insert collection
    if (collection && collection.length > 0) {
      const collectionValues = collection.map(card => [
        id,
        card.cardId,
        card.damage,
        card.health
      ]);

      await connection.query(
        'INSERT INTO player_cards (player_id, card_id, damage, health) VALUES ?',
        [collectionValues]
      );
    }

    // Insert deck
    if (deck && deck.length > 0) {
      const deckValues = deck.map((entry, index) => [
        id,
        entry.cardId,
        index
      ]);

      await connection.query(
        'INSERT INTO player_deck (player_id, card_id, position) VALUES ?',
        [deckValues]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Játékos létrehozva' });
  } catch (error) {
    await connection.rollback();
    console.error('Create player error:', error);
    res.status(500).json({ error: 'Hiba a játékos létrehozása során' });
  } finally {
    connection.release();
  }
});

// Update player
app.put('/api/players/:id', authMiddleware, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { updates } = req.body;

    // Verify player belongs to user
    const [playerCheck] = await connection.query(
      'SELECT id FROM player_profiles WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (playerCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'Nincs hozzáférésed ehhez a játékoshoz' });
    }

    // Update name if provided
    if (updates.name) {
      await connection.query(
        'UPDATE player_profiles SET name = ? WHERE id = ?',
        [updates.name, id]
      );
    }

    // Update collection if provided
    if (updates.collection) {
      await connection.query('DELETE FROM player_cards WHERE player_id = ?', [id]);

      if (updates.collection.length > 0) {
        const collectionValues = updates.collection.map(card => [
          id,
          card.cardId,
          card.damage,
          card.health
        ]);

        await connection.query(
          'INSERT INTO player_cards (player_id, card_id, damage, health) VALUES ?',
          [collectionValues]
        );
      }
    }

    // Update deck if provided
    if (updates.deck) {
      await connection.query('DELETE FROM player_deck WHERE player_id = ?', [id]);

      if (updates.deck.length > 0) {
        const deckValues = updates.deck.map((entry, index) => [
          id,
          entry.cardId,
          index
        ]);

        await connection.query(
          'INSERT INTO player_deck (player_id, card_id, position) VALUES ?',
          [deckValues]
        );
      }
    }

    // Add battle history if provided
    if (updates.battleHistory) {
      // We assume this is adding a new battle, not replacing all history
      const battle = updates.battleHistory[updates.battleHistory.length - 1]; // Get the last one
      await connection.query(
        'INSERT INTO battle_history (player_id, dungeon_id, player_wins, dungeon_wins, player_victory, battle_data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          id,
          battle.dungeonId,
          battle.playerWins,
          battle.dungeonWins,
          battle.playerVictory,
          JSON.stringify(battle.rounds),
          battle.timestamp
        ]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Játékos frissítve' });
  } catch (error) {
    await connection.rollback();
    console.error('Update player error:', error);
    res.status(500).json({ error: 'Hiba a játékos frissítése során' });
  } finally {
    connection.release();
  }
});

// Delete player
app.delete('/api/players/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM player_profiles WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Játékos nem található' });
    }

    res.json({ success: true, message: 'Játékos törölve' });
  } catch (error) {
    console.error('Delete player error:', error);
    res.status(500).json({ error: 'Hiba a játékos törlése során' });
  }
});

// ==================== IMAGE GENERATION ENDPOINTS ====================

// Kép generálása endpoint
app.post('/api/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, filename } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'A prompt mező kötelező!' });
    }

    // Filename generálása, ha nincs megadva (szóköz megtartása)
    const imageFilename = filename || `${prompt.substring(0, 50)}.jpg`;
    const sanitizedFilename = imageFilename.endsWith('.jpg') ? imageFilename : `${imageFilename}.jpg`;
    const imagePath = join(imagesDir, sanitizedFilename);

    // Ellenőrizzük, hogy a fájl már létezik-e
    if (existsSync(imagePath)) {
      console.log(`⚠️ A kép már létezik, használjuk a meglévőt: ${sanitizedFilename}`);
      
      // URL-enkódolt path a válaszban
      const encodedPath = `/images/${encodeURIComponent(sanitizedFilename)}`;
      
      return res.json({
        success: true,
        message: 'A kép már létezik, meglévő kép használata',
        filename: sanitizedFilename,
        path: encodedPath,
        url: `http://localhost:${PORT}${encodedPath}`,
        cached: true
      });
    }

    // URL készítése - a szóközöket és speciális karaktereket enkódoljuk
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920`;

    console.log(`Kép generálása: "${prompt}"`);
    console.log(`URL: ${imageUrl}`);

    // Kép letöltése
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP hiba! Státusz: ${response.status}`);
    }

    // Kép mentése
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await writeFile(imagePath, buffer);

    console.log(`✅ Kép sikeresen mentve: ${sanitizedFilename}`);

    // URL-enkódolt path a válaszban
    const encodedPath = `/images/${encodeURIComponent(sanitizedFilename)}`;

    // Sikeres válasz
    res.json({
      success: true,
      message: 'Kép sikeresen generálva',
      filename: sanitizedFilename,
      path: encodedPath,
      url: `http://localhost:${PORT}${encodedPath}`,
      cached: false
    });

  } catch (error) {
    console.error('Hiba a kép generálása során:', error);
    res.status(500).json({
      error: 'Hiba történt a kép generálása során',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'A szerver működik' });
});

// Lista az összes generált képről
app.get('/api/images', authMiddleware, (req, res) => {
  try {
    const fs = require('fs');
    const files = fs.readdirSync(imagesDir).filter(file => file.endsWith('.jpg'));
    const images = files.map(file => ({
      filename: file,
      url: `http://localhost:${PORT}/images/${file}`
    }));
    res.json({ images });
  } catch (error) {
    res.status(500).json({ error: 'Hiba a képek listázása során' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend szerver elindult: http://localhost:${PORT}`);
  console.log(`📁 Képek mentési helye: ${imagesDir}`);
  console.log(`🔐 Autentikáció engedélyezve`);
  console.log(`🎨 API endpoints:`);
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - GET  /api/environments`);
  console.log(`   - POST /api/environments`);
  console.log(`   - GET  /api/players`);
  console.log(`   - POST /api/players`);
});
