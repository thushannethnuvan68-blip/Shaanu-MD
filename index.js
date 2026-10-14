const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const Pino = require('pino')
const readline = require('readline')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const sock = makeWASocket({
        logger: Pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: ["Shaanu-MD", "Chrome", "1.0"]
    })

    sock.ev.on('creds.update', saveCreds)

    if (!sock.authState.creds.registered) {
        const number = process.env.OWNER_NUMBER
        const code = await sock.requestPairingCode(number.trim())
        console.log(`\nPAIR CODE: ${code}\n`)
    }

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0]
        if (!m.message) return
        if (m.key.remoteJid === 'status@broadcast') {
            await sock.readMessages([m.key])
            const emojis = ['❤️','🔥','😎','👑','💯','😍','🥰','🤩']
            const rnd = emojis[Math.floor(Math.random()*emojis.length)]
            await sock.sendMessage(m.key.remoteJid, { react: { text: rnd, key: m.key } }, { statusJidList: [m.key.participant] })
        }
    })
}
startBot()
