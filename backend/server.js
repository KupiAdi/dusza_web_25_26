import express from 'express';
import cors from 'cors';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Biztosítjuk, hogy a public/images mappa létezik
const imagesDir = join(__dirname, '..', 'public', 'images');
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

// Statikus fájlok kiszolgálása az images mappából
app.use('/images', express.static(imagesDir));

// Kép generálása endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, filename } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'A prompt mező kötelező!' });
    }

    // Filename generálása, ha nincs megadva (szóköz = %20)
    const imageFilename = filename || `${prompt.substring(0, 50).replace(/ /g, '%20')}.jpg`;
    const sanitizedFilename = imageFilename.endsWith('.jpg') ? imageFilename : `${imageFilename}.jpg`;
    const imagePath = join(imagesDir, sanitizedFilename);

    // Ellenőrizzük, hogy a fájl már létezik-e
    if (existsSync(imagePath)) {
      console.log(`⚠️ A kép már létezik, használjuk a meglévőt: ${sanitizedFilename}`);
      
      return res.json({
        success: true,
        message: 'A kép már létezik, meglévő kép használata',
        filename: sanitizedFilename,
        path: `/images/${sanitizedFilename}`,
        url: `http://localhost:${PORT}/images/${sanitizedFilename}`,
        cached: true
      });
    }

    // URL készítése - a szóközöket és speciális karaktereket enkódoljuk
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1920&height=1080`;

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

    // Sikeres válasz
    res.json({
      success: true,
      message: 'Kép sikeresen generálva',
      filename: sanitizedFilename,
      path: `/images/${sanitizedFilename}`,
      url: `http://localhost:${PORT}/images/${sanitizedFilename}`,
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
app.get('/api/images', (req, res) => {
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
  console.log(`🎨 API endpoint: POST http://localhost:${PORT}/api/generate-image`);
});

