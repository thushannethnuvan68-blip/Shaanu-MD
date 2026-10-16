const { Telegraf } = require('telegraf');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
const QRCode = require('qrcode');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const tgBot = new Telegraf(TELEGRAM_TOKEN);
let waSock = null;
let ownerChatId = null;

async function startWA() {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const { version } = await fetchLatestBaileysVersion();
    waSock = makeWASocket({
        auth: state, version,
        logger: P({ level: 'silent' }),
        browser: ["Shaanu-BOT","Chrome","1.0"],
        printQRInTerminal: false
    });
    waSock.ev.on('creds.update', saveCreds);
    waSock.ev.on('connection.update', async (u) => {
        if (u.qr) {
            try {
                await QRCode.toFile('./qr.png', u.qr);
                if (ownerChatId) await tgBot.telegram.sendPhoto(ownerChatId, { source: './qr.png' }, { caption: "📱 SCAN: WhatsApp > Linked Devices > Link a Device\n/qr for new QR" });
            } catch(e){ console.log(e) }
        }
        if (u.connection === 'open' && ownerChatId) {
            tgBot.telegram.sendMessage(ownerChatId, "✅ WHATSAPP CONNECTED!\n\n/wa 9477xxxx msg - Telegram eken yawanna");
        }
        if (u.connection === 'close') {
            const r = u.lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (r) setTimeout(startWA, 3000);
        }
    });
    waSock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg?.message || msg.key.fromMe) return;
            const from = msg.key.remoteJid.replace('@s.whatsapp.net','');
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "Media";
            if (ownerChatId) tgBot.telegram.sendMessage(ownerChatId, `📩 ${from}: ${text}\nReply: /wa ${from} hi`);
        } catch {}
    });
}

tgBot.start((ctx) => {
    ownerChatId = String(ctx.chat.id);
    try{ fs.writeFileSync('owner.txt', ownerChatId); }catch{}
    ctx.reply("✅ Owner set!\n/qr - Get QR\n/wa 9477xxxx msg");
});
tgBot.command('qr', async (ctx) => {
    ownerChatId = String(ctx.chat.id);
    try{ fs.writeFileSync('owner.txt', ownerChatId); }catch{}
    ctx.reply("⏳ Generating QR...");
    try{ fs.rmSync('auth', {recursive:true, force:true}); }catch{}
    startWA();
});
tgBot.command('wa', async (ctx) => {
    const p = ctx.message.text.split(' ').slice(1);
    if (p.length < 2) return ctx.reply("Use: /wa 9477xxxx hello");
    try{
        await waSock.sendMessage(p[0]+"@s.whatsapp.net", { text: p.slice(1).join(' ') });
        ctx.reply("✅ Sent");
    }catch{ ctx.reply("❌ Not connected. /qr"); }
});

tgBot.launch();
startWA();
console.log("Bot Started");