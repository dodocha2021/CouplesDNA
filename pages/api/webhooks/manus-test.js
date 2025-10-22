import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    method: req.method,
    headers: req.headers,
    body: req.body
  }
  
  // 保存到文件
  const logPath = path.join(process.cwd(), 'webhook-log.json')
  fs.writeFileSync(logPath, JSON.stringify(logData, null, 2))
  
  console.log('========================================')
  console.log('🔔 WEBHOOK RECEIVED!', timestamp)
  console.log('========================================')
  console.log('Body:', JSON.stringify(req.body, null, 2))
  console.log('========================================')
  
  return res.status(200).json({ 
    received: true,
    timestamp 
  })
}