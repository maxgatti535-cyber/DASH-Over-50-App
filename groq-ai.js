const handler = async (event, context) => {
  // CORS headers for cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, language = 'en' } = JSON.parse(event.body);

    // Validate input
    if (!message || typeof message !== 'string') {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Initialize Groq client
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Medical safety prompts based on language
    const safetyPrompts = {
      en: {
        system: `You are a DASH diet AI health coach for adults 50+. IMPORTANT SAFETY RULES:
        1. NEVER give specific medication advice or recommend stopping medications
        2. ALWAYS recommend consulting a doctor for medical concerns
        3. Focus on DASH diet, exercise, stress management, and general wellness
        4. If user mentions chest pain, severe symptoms, or emergencies - advise immediate medical help
        5. Provide evidence-based information for cardiovascular health
        6. Be encouraging and supportive while maintaining professional boundaries`,
        emergency: "If you're experiencing severe symptoms like chest pain, difficulty breathing, or other emergency symptoms, please seek immediate medical attention by calling 911 or visiting the nearest emergency room."
      },
      it: {
        system: `Sei un AI coach di salute per la dieta DASH per adulti over 50. REGOLE DI SICUREZZA IMPORTANTI:
        1. MAI dare consigli specifici sui farmaci o raccomandare di interrompere i farmaci
        2. SEMPRE raccomandare di consultare un medico per problemi di salute
        3. Concentrati su dieta DASH, esercizio, gestione dello stress e benessere generale
        4. Se l'utente menziona dolore al petto, sintomi gravi o emergenze - consiglia aiuto medico immediato
        5. Fornisci informazioni basate sull'evidenza per la salute cardiovascolare
        6. Sii incoraggiante e solidale mantenendo confini professionali`,
        emergency: "Se stai riscontrando sintomi gravi come dolore al petto, difficoltà respiratorie o altri sintomi di emergenza, cerca immediatamente assistenza medica chiamando il 112 o visitando la sala di emergenza più vicina."
      }
    };

    const currentLang = safetyPrompts[language] || safetyPrompts.en;

    // Check for emergency keywords
    const emergencyKeywords = language === 'it' 
      ? ['dolore al petto', 'difficoltà respiratorie', 'emergenza', 'sintomi gravi', 'attacco cardiaco']
      : ['chest pain', 'difficulty breathing', 'emergency', 'severe symptoms', 'heart attack'];

    const hasEmergency = emergencyKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );

    if (hasEmergency) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          response: currentLang.emergency,
          isEmergency: true
        })
      };
    }

    // Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: currentLang.system },
        { role: 'user', content: message }
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.7,
      max_tokens: 500
    });

    const response = chatCompletion.choices[0]?.message?.content || 
      (language === 'it' ? 'Mi dispiace, non sono riuscito a elaborare la tua richiesta.' : 'Sorry, I could not process your request.');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        response: response,
        isEmergency: false
      })
    };

  } catch (error) {
    console.error('Groq API Error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Service temporarily unavailable',
        fallback: language === 'it' 
          ? 'Mi dispiace, il servizio è temporaneamente non disponibile. Per favore riprova più tardi.'
          : 'Sorry, the service is temporarily unavailable. Please try again later.'
      })
    };
  }
};

module.exports = { handler };