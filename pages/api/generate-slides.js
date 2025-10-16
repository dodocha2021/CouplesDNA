export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reportContent } = req.body;

  try {
    const response = await fetch(process.env.MANUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_MANUS_API_KEY}`
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `请将以下报告转换为 presentation slides，返回 JSON 格式（包含 files 数组，每个元素有 id 和 content 字段，content 是完整 HTML，1280x720 尺寸，使用 link 标签引入 https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css）：\n\n${reportContent}`
        }]
      })
    });

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || data.content?.[0]?.text;
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const slidesData = JSON.parse(text);

    res.status(200).json(slidesData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
