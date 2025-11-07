import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initDatabase() {
  console.log('🔧 Adatbázis inicializálás...\n');

  try {
    // Kapcsolódás MySQL-hez (adatbázis nélkül)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ Kapcsolódva a MySQL szerverhez');

    // SQL fájl beolvasása
    const sqlFile = join(__dirname, 'database.sql');
    const sql = readFileSync(sqlFile, 'utf8');

    console.log('📄 SQL fájl beolvasva');

    // SQL futtatása
    await connection.query(sql);

    console.log('✅ Adatbázis létrehozva');
    console.log('✅ Táblák létrehozva');
    console.log('\n🎉 Inicializálás sikeres!\n');

    console.log('Következő lépések:');
    console.log('1. Indítsd el a backend szervert: npm start');
    console.log('2. Indítsd el a frontend szervert: cd .. && npm run dev');
    console.log('3. Nyisd meg a böngészőben: http://localhost:5173\n');

    await connection.end();
  } catch (error) {
    console.error('❌ Hiba történt:', error.message);
    console.error('\nEllenőrizd:');
    console.error('- A MySQL szerver fut-e');
    console.error('- A .env fájl helyesen van-e kitöltve');
    console.error('- A DB_USER és DB_PASSWORD helyes-e\n');
    process.exit(1);
  }
}

initDatabase();

