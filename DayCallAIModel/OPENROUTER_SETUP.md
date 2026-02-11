# OpenRouter Entegrasyonu - Hızlı Başlangıç

## ✅ Yapılan Değişiklikler

`ultra_fast_core.py` dosyası OpenRouter kullanacak şekilde güncellendi!

### 1. API Endpoint Değişti
- **Eski:** Google Gemini REST API
- **Yeni:** OpenRouter API (OpenAI-compatible)

### 2. Request Format Değişti
- **Eski:** Gemini format (`contents`, `systemInstruction`)
- **Yeni:** OpenAI format (`messages`, `role: system/user`)

### 3. Response Parsing Değişti
- **Eski:** `data["candidates"][0]["content"]["parts"][0]["text"]`
- **Yeni:** `data["choices"][0]["message"]["content"]`

---

## 🔧 .env Dosyasını Güncelle

`.env` dosyasını aç ve şu şekilde değiştir:

```env
# ESKİ (sil veya yorum yap)
# GOOGLE_API_KEY=AIzaSy...

# YENİ (OpenRouter API key'ini buraya yapıştır)
OPENROUTER_API_KEY=sk-or-v1-...

# ElevenLabs (değişmedi)
ELEVENLABS_API_KEY=sk_...
```

---

## 🎯 OpenRouter API Key Nasıl Alınır?

1. https://openrouter.ai/ adresine git
2. Kayıt ol / Giriş yap
3. **Keys** bölümünden yeni bir API key oluştur
4. Key'i kopyala ve `.env` dosyasına yapıştır

---

## 🤖 Kullanılabilir Modeller

Kodda varsayılan olarak `google/gemini-flash-1.5` kullanılıyor. Bunu değiştirebilirsin:

### Popüler Modeller:
```python
"model": "google/gemini-flash-1.5"           # Hızlı, ucuz (varsayılan)
"model": "google/gemini-pro-1.5"             # Daha güçlü
"model": "anthropic/claude-3.5-sonnet"       # Claude (çok iyi Türkçe)
"model": "openai/gpt-4o"                     # GPT-4o
"model": "meta-llama/llama-3.1-70b-instruct" # Llama (ücretsiz)
```

### Model Değiştirmek İçin:
`ultra_fast_core.py` dosyasında **satır 417** civarında:
```python
"model": "google/gemini-flash-1.5",  # Buraya istediğin modeli yaz
```

---

## 💰 Fiyatlandırma

OpenRouter, kullandığın modele göre ücretlendirir:
- **Gemini Flash:** ~$0.075 / 1M token (çok ucuz)
- **Claude 3.5 Sonnet:** ~$3 / 1M token
- **GPT-4o:** ~$2.5 / 1M token

Bazı modeller **ücretsiz** (örn: Llama modelleri)

---

## 🚀 Kullanım

```bash
python ultra_fast_core.py
```

**Beklenen Çıktı:**
```
🚀 ULTRA-FAST CORE - Zero-Latency Voice AI
🧠 AI düşünüyor (OpenRouter)...
   ⏱️  LLM tamamlandı: 1500ms
🤖 AI: [OpenRouter'dan gelen cevap]
```

---

## 🔍 Hata Ayıklama

### "API anahtarları eksik" Hatası
- `.env` dosyasında `OPENROUTER_API_KEY` olduğundan emin ol
- Key'in başında `sk-or-v1-` olmalı

### "401 Unauthorized" Hatası
- API key'in geçerli olduğunu kontrol et
- OpenRouter dashboard'da kredi olduğundan emin ol

### "Model not found" Hatası
- Model ismini kontrol et (örn: `google/gemini-flash-1.5`)
- OpenRouter'da desteklenen modeller: https://openrouter.ai/models

---

## 📝 Özet

✅ Kod güncellendi (OpenRouter entegrasyonu)  
⚠️ `.env` dosyasını manuel olarak güncelle  
✅ Model seçimini istediğin gibi değiştirebilirsin  

**Sonraki adım:** `.env` dosyasına OpenRouter API key'ini ekle ve test et! 🎉
