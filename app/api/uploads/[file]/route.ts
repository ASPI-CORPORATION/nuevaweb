import { readUpload } from '@/lib/uploads'

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const upload = await readUpload(file)
  if (!upload) return new Response('Not found', { status: 404 })

  return new Response(new Uint8Array(upload.data), {
    headers: {
      'Content-Type': upload.type,
      'Content-Length': String(upload.data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    },
  })
}
