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

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const imagesDir = join(__dirname, '..', 'public', 'images');
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

app.use('/images', express.static(imagesDir));

// ==================== AUTH ENDPOINTS ====================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Minden mező kitöltése kötelező' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie' });
    }

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'A felhasználónév vagy email már foglalt' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Felhasználónév és jelszó megadása kötelező' });
    }

    const [users] = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Helytelen felhasználónév vagy jelszó' });
    }

    const user = users[0];

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

app.get('/api/environments', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await db.query(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    const isAdmin = currentUser.length > 0 && currentUser[0].username === 'admin';
    
    let environments;
    if (isAdmin) {
      [environments] = await db.query(
        'SELECT id, name, created_at, updated_at FROM environments WHERE user_id = ?',
        [req.user.userId]
      );
    } else {
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

    const enrichedEnvironments = await Promise.all(
      environments.map(async (env) => {
        const [worldCards] = await db.query(
          'SELECT id, name, damage, health, element, kind, source_card_id as sourceCardId, background_image as backgroundImage FROM world_cards WHERE environment_id = ?',
          [env.id]
        );

        const [dungeons] = await db.query(
          'SELECT id, name, type FROM dungeons WHERE environment_id = ?',
          [env.id]
        );

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

app.post('/api/environments', authMiddleware, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const [currentUser] = await connection.query(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (currentUser.length === 0 || currentUser[0].username !== 'admin') {
      return res.status(403).json({ error: 'Csak az admin felhasználó hozhat létre környezetet' });
    }

    await connection.beginTransaction();

    const { environment } = req.body;
    const { id, name, worldCards, dungeons } = environment;

    const [existing] = await connection.query(
      'SELECT id FROM environments WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (existing.length === 0) {
      await connection.query(
        'INSERT INTO environments (id, user_id, name) VALUES (?, ?, ?)',
        [id, req.user.userId, name]
      );
    } else {
      await connection.query(
        'UPDATE environments SET name = ? WHERE id = ? AND user_id = ?',
        [name, id, req.user.userId]
      );

      await connection.query('DELETE FROM world_cards WHERE environment_id = ?', [id]);
      await connection.query('DELETE FROM dungeons WHERE environment_id = ?', [id]);
    }

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

    if (dungeons && dungeons.length > 0) {
      for (const dungeon of dungeons) {
        await connection.query(
          'INSERT INTO dungeons (id, environment_id, name, type) VALUES (?, ?, ?, ?)',
          [dungeon.id, id, dungeon.name, dungeon.type]
        );

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

    const [validCards] = await connection.query(
      'SELECT id, kind FROM world_cards WHERE environment_id = ?',
      [id]
    );
    const validCardIds = validCards.map(card => card.id);
    const standardCardIds = validCards.filter(card => card.kind === 'standard').map(card => card.id);

    const [playersInEnv] = await connection.query(
      'SELECT id FROM player_profiles WHERE environment_id = ?',
      [id]
    );

    if (playersInEnv.length > 0) {
      
      if (validCardIds.length > 0) {
        const placeholders = validCardIds.map(() => '?').join(',');

        for (const player of playersInEnv) {
          const [cardResult] = await connection.query(
            `DELETE FROM player_cards WHERE player_id = ? AND card_id NOT IN (${placeholders})`,
            [player.id, ...validCardIds]
          );

          const [deckResult] = await connection.query(
            `DELETE FROM player_deck WHERE player_id = ? AND card_id NOT IN (${placeholders})`,
            [player.id, ...validCardIds]
          );

          if (standardCardIds.length > 0) {
            const standardPlaceholders = standardCardIds.map(() => '?').join(',');
            
            const [existingCards] = await connection.query(
              `SELECT card_id FROM player_cards WHERE player_id = ? AND card_id IN (${standardPlaceholders})`,
              [player.id, ...standardCardIds]
            );
            const existingCardIds = new Set(existingCards.map(row => row.card_id));
            const newStandardCards = standardCardIds.filter(cardId => !existingCardIds.has(cardId));

            if (newStandardCards.length > 0) {
              const newCardValues = newStandardCards.map(cardId => [player.id, cardId, 0, 0]);
              await connection.query(
                'INSERT INTO player_cards (player_id, card_id, damage_bonus, health_bonus) VALUES ?',
                [newCardValues]
              );
            }
          }
        }
      } else {
        for (const player of playersInEnv) {
          await connection.query(
            'DELETE FROM player_cards WHERE player_id = ?',
            [player.id]
          );
          await connection.query(
            'DELETE FROM player_deck WHERE player_id = ?',
            [player.id]
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

// Update card background image
app.patch('/api/environments/:envId/cards/:cardId/image', authMiddleware, async (req, res) => {
  try {
    const [currentUser] = await db.query(
      'SELECT username FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    if (currentUser.length === 0 || currentUser[0].username !== 'admin') {
      return res.status(403).json({ error: 'Csak az admin felhasználó frissíthet kártyát' });
    }

    const { envId, cardId } = req.params;
    const { backgroundImage } = req.body;

    const [envCheck] = await db.query(
      'SELECT id FROM environments WHERE id = ? AND user_id = ?',
      [envId, req.user.userId]
    );

    if (envCheck.length === 0) {
      return res.status(404).json({ error: 'Környezet nem található' });
    }

    // Update card background image
    const [result] = await db.query(
      'UPDATE world_cards SET background_image = ? WHERE id = ? AND environment_id = ?',
      [backgroundImage || null, cardId, envId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Kártya nem található' });
    }

    res.json({ success: true, message: 'Kártya képe frissítve' });
  } catch (error) {
    console.error('Update card image error:', error);
    res.status(500).json({ error: 'Hiba a kártya kép frissítése során' });
  }
});

app.delete('/api/environments/:id', authMiddleware, async (req, res) => {
  try {
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

app.get('/api/players', authMiddleware, async (req, res) => {
  try {
    const [players] = await db.query(
      'SELECT id, name, environment_id as environmentId FROM player_profiles WHERE user_id = ?',
      [req.user.userId]
    );

    const enrichedPlayers = await Promise.all(
      players.map(async (player) => {
        const [collection] = await db.query(
          'SELECT card_id as cardId, damage_bonus as damageBonus, health_bonus as healthBonus FROM player_cards WHERE player_id = ?',
          [player.id]
        );

        const [deck] = await db.query(
          'SELECT card_id as cardId FROM player_deck WHERE player_id = ? ORDER BY position',
          [player.id]
        );

        const [battles] = await db.query(
          'SELECT dungeon_id as dungeonId, player_wins as playerWins, dungeon_wins as dungeonWins, player_victory as playerVictory, timestamp FROM battle_history WHERE player_id = ? ORDER BY timestamp DESC',
          [player.id]
        );

        const battleHistory = battles.map(battle => ({
          dungeonId: battle.dungeonId,
          playerWins: battle.playerWins,
          dungeonWins: battle.dungeonWins,
          playerVictory: Boolean(battle.playerVictory),
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

app.post('/api/players', authMiddleware, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { player } = req.body;
    const { id, name, environmentId, collection, deck } = player;

    const [envCheck] = await connection.query(
      'SELECT id FROM environments WHERE id = ?',
      [environmentId]
    );

    if (envCheck.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'A környezet nem található' });
    }

    await connection.query(
      'INSERT INTO player_profiles (id, user_id, name, environment_id) VALUES (?, ?, ?, ?)',
      [id, req.user.userId, name, environmentId]
    );

    if (collection && collection.length > 0) {
      const collectionValues = collection.map(card => [
        id,
        card.cardId,
        card.damageBonus,
        card.healthBonus
      ]);

      await connection.query(
        'INSERT INTO player_cards (player_id, card_id, damage_bonus, health_bonus) VALUES ?',
        [collectionValues]
      );
    }

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

    const [playerCheck] = await connection.query(
      'SELECT id FROM player_profiles WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (playerCheck.length === 0) {
      await connection.rollback();
      return res.status(403).json({ error: 'Nincs hozzáférésed ehhez a játékoshoz' });
    }

    if (updates.name) {
      await connection.query(
        'UPDATE player_profiles SET name = ? WHERE id = ?',
        [updates.name, id]
      );
    }

    if (updates.collection) {
      await connection.query('DELETE FROM player_cards WHERE player_id = ?', [id]);

      if (updates.collection.length > 0) {
        const collectionValues = updates.collection.map(card => [
          id,
          card.cardId,
          card.damageBonus,
          card.healthBonus
        ]);

        await connection.query(
          'INSERT INTO player_cards (player_id, card_id, damage_bonus, health_bonus) VALUES ?',
          [collectionValues]
        );
      }
    }

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

    if (updates.battleHistory) {
      const battle = updates.battleHistory[updates.battleHistory.length - 1]; // Get the last one
      await connection.query(
        'INSERT INTO battle_history (player_id, dungeon_id, player_wins, dungeon_wins, player_victory, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          battle.dungeonId,
          battle.playerWins,
          battle.dungeonWins,
          battle.playerVictory,
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

app.post('/api/generate-image', authMiddleware, async (req, res) => {
  try {
    const { prompt, filename } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'A prompt mező kötelező!' });
    }

    const imageFilename = filename || `${prompt.substring(0, 50)}.jpg`;
    const sanitizedFilename = imageFilename.endsWith('.jpg') ? imageFilename : `${imageFilename}.jpg`;
    const imagePath = join(imagesDir, sanitizedFilename);

    if (existsSync(imagePath)) {
      console.log(`⚠️ A kép már létezik, használjuk a meglévőt: ${sanitizedFilename}`);
      
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

    const detailedPrompt = `Fantasy trading card game character art, ${prompt}, digital art, detailed fantasy character portrait, professional game card illustration, high quality, centered composition, dramatic lighting, epic fantasy style, sharp focus, trending on artstation`;
    
    const encodedPrompt = encodeURIComponent(detailedPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1080&height=1920&nologo=true&enhance=true`;

    console.log(`Kép generálása: "${prompt}"`);

    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP hiba! Státusz: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await writeFile(imagePath, buffer);

    console.log(`✅ Kép sikeresen mentve: ${sanitizedFilename}`);

    const encodedPath = `/images/${encodeURIComponent(sanitizedFilename)}`;

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'A szerver működik' });
});

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
