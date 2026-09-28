import net from 'node:net'
import tls from 'node:tls'
import { prisma } from '@/lib/db/client'

/**
 * ============================================================================
 * MAIL TRANSPORT
 * ============================================================================
 * Every attempt is recorded in `email_messages` so the organizer has a delivery
 * history even before a provider is connected (`MAIL_TRANSPORT=log`, default).
 *
 * `smtp` uses a minimal, dependency-free SMTP client (STARTTLS implicit or
 * explicit, AUTH LOGIN). Nothing in the application depends on the transport
 * being configured: without credentials, messages are logged and queued.
 */

export interface SendEmailInput {
  to: string
  subject: string
  body: string
  templateKey: string
  kind?: 'transactional' | 'marketing'
}

export interface SendEmailResult {
  id: string
  status: 'sent' | 'queued' | 'failed'
  error?: string
}

export function mailConfigured(): boolean {
  return process.env.MAIL_TRANSPORT === 'smtp' && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER)
}

export function mailStatusLabel(): string {
  return mailConfigured() ? 'Connected' : 'Not configured — delivery logging only'
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transport = process.env.MAIL_TRANSPORT || 'log'
  const record = await prisma.emailMessage.create({
    data: {
      to: input.to,
      subject: input.subject,
      body: input.body,
      templateKey: input.templateKey,
      kind: input.kind ?? 'transactional',
      transport,
      status: 'queued',
    },
  })

  if (!mailConfigured()) {
    console.info(`[mail] queued (no transport configured) → ${input.to} :: ${input.subject}`)
    return { id: record.id, status: 'queued' }
  }

  try {
    await smtpSend({
      from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
      to: input.to,
      subject: input.subject,
      body: input.body,
    })
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: { status: 'sent', sentAt: new Date() },
    })
    return { id: record.id, status: 'sent' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown transport error'
    await prisma.emailMessage.update({
      where: { id: record.id },
      data: { status: 'failed', error: message.slice(0, 400) },
    })
    console.error('[mail] send failed', message)
    return { id: record.id, status: 'failed', error: message }
  }
}

interface SmtpInput {
  from: string
  to: string
  subject: string
  body: string
}

function smtpSend({ from, to, subject, body }: SmtpInput): Promise<void> {
  const host = process.env.SMTP_HOST as string
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER as string
  const password = process.env.SMTP_PASSWORD || ''
  const implicitTls = port === 465

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body.replace(/^\./gm, '..'),
  ].join('\r\n')

  return new Promise<void>((resolve, reject) => {
    let socket: net.Socket = implicitTls
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port })

    const timeout = setTimeout(() => {
      socket.destroy()
      reject(new Error('SMTP timeout'))
    }, 15_000)

    let buffer = ''
    let step = 0
    const errors: string[] = []

    const write = (line: string) => socket.write(`${line}\r\n`)

    const steps = [
      // Greeting expected: 220
      () => write(`EHLO trishul-summit`),
      // EHLO reply handled below (may be multiline, STARTTLS advertised)
      () => {
        if (!implicitTls) {
          write('STARTTLS')
          return
        }
        write(`AUTH LOGIN ${Buffer.from(user).toString('base64')}`)
      },
      () => write(Buffer.from(password).toString('base64')),
      () => write(`MAIL FROM:<${from}>`),
      () => write(`RCPT TO:<${to}>`),
      () => write('DATA'),
      () => {
        socket.write(`${message}\r\n.\r\n`)
      },
      () => write('QUIT'),
    ]

    const advance = () => {
      const next = steps[step]
      step += 1
      if (next) next()
    }

    const onReady = (data: string) => {
      const code = Number(data.slice(0, 3))
      if (code >= 400) {
        errors.push(data.trim())
        return
      }

      // After STARTTLS acceptance, upgrade the socket and re-EHLO.
      if (step === 2 && !implicitTls && data.startsWith('220')) {
        socket.removeAllListeners('data')
        socket = tls.connect({ socket, servername: host })
        socket.on('data', (chunk) => attach(chunk.toString()))
        socket.once('secureConnect', () => {
          write('EHLO trishul-summit')
        })
        return
      }

      if (data.startsWith('221')) {
        clearTimeout(timeout)
        socket.end()
        resolve()
        return
      }

      advance()
    }

    function attach(chunk: string) {
      buffer += chunk
      if (!buffer.includes('\r\n')) return
      const lines = buffer.split('\r\n')
      buffer = lines.pop() ?? ''
      const last = lines[lines.length - 1] ?? ''
      // Multiline SMTP replies (250-CONTINUE vs 250 SPACE) — wait for the final line.
      if (/^\d{3}-/.test(last)) return
      onReady(lines.join('\n'))
    }

    socket.on('data', (chunk: Buffer) => attach(chunk.toString('utf8')))
    socket.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    socket.on('close', () => {
      clearTimeout(timeout)
      if (step >= steps.length) resolve()
      else reject(new Error(`SMTP closed early: ${errors.join(' | ') || 'no response'}`))
    })
  })
}
