import "dotenv/config";
import {
  Client, GatewayIntentBits, REST, Routes,
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
} from "discord.js";
import fs from "node:fs";

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error(".env dosyasını kontrol et");
}

const WARN_FILE = "warnings.json";
const loadWarns = (): Record<string, string[]> =>
  fs.existsSync(WARN_FILE) ? JSON.parse(fs.readFileSync(WARN_FILE, "utf8")) : {};
const saveWarns = (w: Record<string, string[]>) =>
  fs.writeFileSync(WARN_FILE, JSON.stringify(w, null, 2));

const commands = [
  new SlashCommandBuilder().setName("temizle").setDescription("Mesaj siler")
    .addIntegerOption(o => o.setName("adet").setDescription("1-100")
      .setMinValue(1).setMaxValue(100).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder().setName("at").setDescription("Üyeyi atar")
    .addUserOption(o => o.setName("uye").setDescription("Üye").setRequired(true))
    .addStringOption(o => o.setName("sebep").setDescription("Sebep"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName("yasakla").setDescription("Üyeyi banlar")
    .addUserOption(o => o.setName("uye").setDescription("Üye").setRequired(true))
    .addStringOption(o => o.setName("sebep").setDescription("Sebep"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName("sustur").setDescription("Üyeye zaman aşımı verir")
    .addUserOption(o => o.setName("uye").setDescription("Üye").setRequired(true))
    .addIntegerOption(o => o.setName("dakika").setDescription("Süre (dakika)")
      .setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption(o => o.setName("sebep").setDescription("Sebep"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName("uyar").setDescription("Üyeyi uyarır")
    .addUserOption(o => o.setName("uye").setDescription("Üye").setRequired(true))
    .addStringOption(o => o.setName("sebep").setDescription("Sebep").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName("uyarilar").setDescription("Üyenin uyarılarını gösterir")
    .addUserOption(o => o.setName("uye").setDescription("Üye").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
].map(c => c.toJSON());

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("interactionCreate", async (i) => {
  if (!i.isChatInputCommand() || !i.guild) return;
  const gizli = (content: string) =>
    i.reply({ content, flags: MessageFlags.Ephemeral });

  try {
    if (i.commandName === "temizle") {
      const adet = i.options.getInteger("adet", true);
      if (!i.channel?.isTextBased() || !("bulkDelete" in i.channel)) {
        return gizli("Bu kanalda mesaj silemem.");
      }
      const silinen = await i.channel.bulkDelete(adet, true);
      return gizli(`${silinen.size} mesaj silindi.`);
    }

    const user = i.options.getUser("uye", true);
    const sebep = i.options.getString("sebep") ?? "Sebep belirtilmedi";

    if (i.commandName === "yasakla") {
      await i.guild.members.ban(user, { reason: sebep });
      return i.reply(`${user.tag} yasaklandı. Sebep: ${sebep}`);
    }

    if (i.commandName === "uyarilar") {
      const liste = loadWarns()[user.id] ?? [];
      return gizli(liste.length ? liste.join("\n") : "Uyarı yok.");
    }

    const member = await i.guild.members.fetch(user.id);

    if (i.commandName === "at") {
      if (!member.kickable) return gizli("Bu üyeyi atamam (rolü benden yüksek olabilir).");
      await member.kick(sebep);
      return i.reply(`${user.tag} atıldı. Sebep: ${sebep}`);
    }

    if (i.commandName === "sustur") {
      if (!member.moderatable) return gizli("Bu üyeye zaman aşımı veremem.");
      const dk = i.options.getInteger("dakika", true);
      await member.timeout(dk * 60_000, sebep);
      return i.reply(`${user.tag} ${dk} dakika susturuldu. Sebep: ${sebep}`);
    }

    if (i.commandName === "uyar") {
      const w = loadWarns();
      (w[user.id] ??= []).push(`${new Date().toLocaleString("tr-TR")} - ${sebep}`);
      saveWarns(w);
      return i.reply(`${user.tag} uyarıldı (toplam ${w[user.id].length}). Sebep: ${sebep}`);
    }
  } catch (err) {
    console.error(err);
    if (!i.replied) await gizli("Bir hata oluştu.");
  }
});

async function main() {
  const rest = new REST().setToken(DISCORD_TOKEN!);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID!, GUILD_ID!), { body: commands });
  client.once("clientReady", (c) => console.log(`${c.user.tag} hazır`));
  await client.login(DISCORD_TOKEN);
}
main();