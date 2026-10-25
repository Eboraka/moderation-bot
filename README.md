# moderation-bot 🛡️

TypeScript ve discord.js ile yazılmış Discord moderasyon botu.

## Komutlar

| Komut | Açıklama |
|---|---|
| /yasakla | Üyeyi sunucudan yasaklar |
| /at | Üyeyi sunucudan atar |
| /sustur | Üyeye zaman aşımı verir |
| /uyar | Üyeyi uyarır |
| /uyarilar | Üyenin uyarılarını listeler |
| /temizle | Toplu mesaj siler |

## Kurulum

1. npm install
2. Ana klasörde .env dosyası oluştur:
   
   DISCORD_TOKEN=
   CLIENT_ID=
   GUILD_ID=
   
3. npx tsx src/index.ts
