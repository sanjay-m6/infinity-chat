const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('https://integrate.api.nvidia.com/v1/chat/completions', {
      model: 'moonshotai/kimi-k2.5',
      messages: [{role:'user', content:'hello'}],
      max_tokens: 150
    }, {
      headers: { Authorization: 'Bearer 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' }
    });
    console.log("SUCCESS:", JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error('ERROR RESPONSE:', e.response?.data || e.message);
  }
}
test();