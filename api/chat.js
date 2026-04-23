export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { system, message } = req.body
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '68dcb7e9c7575987286f795337e31adc'
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || ''

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
      {
        method: 'POST',
        headers: {
          'X-Auth-Email': 'smetsug@gmail.com',
          'X-Auth-Key': process.env.CLOUDFLARE_API_TOKEN,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: message }
          ]
        })
      }
    )

    const data = await response.json()
    console.log('Cloudflare response:', JSON.stringify(data).substring(0, 300))
    
    if (!data.success) {
      const errorMsg = data.errors?.[0]?.message || 'Error desconegut'
      res.status(200).json({ text: `Error: ${errorMsg}` })
      return
    }

    const text = data.result?.response || 'No he pogut generar una resposta.'
    res.status(200).json({ text })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: error.message })
  }
}
